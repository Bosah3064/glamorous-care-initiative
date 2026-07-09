import 'package:flutter/material.dart';

import '../services/supabase_service.dart';

class ManagePaymentsScreen extends StatefulWidget {
  static const route = '/manage-payments';
  const ManagePaymentsScreen({super.key});

  @override
  State<ManagePaymentsScreen> createState() => _ManagePaymentsScreenState();
}

class _ManagePaymentsScreenState extends State<ManagePaymentsScreen> {
  Future<void> _toggleStatus(Map<String, dynamic> payment) async {
    final id = payment['id']?.toString();
    if (id == null) return;
    final current = payment['status'] as String? ?? 'Pending';
    final next = current.toLowerCase() == 'paid' ? 'Pending' : 'Paid';
    await SupabaseService.updatePayment(id, {'status': next});
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text('Updated to $next')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Manage Payments')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Payments',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Expanded(
              child: StreamBuilder<List<Map<String, dynamic>>>(
                stream: SupabaseService.paymentsStream(),
                builder: (context, snapshot) {
                  if (snapshot.hasError)
                    return Text('Error: ${snapshot.error}');
                  if (!snapshot.hasData)
                    return const Center(child: CircularProgressIndicator());
                  final payments = snapshot.data!;
                  if (payments.isEmpty)
                    return const Center(child: Text('No payments yet'));
                  return ListView.separated(
                    itemCount: payments.length,
                    separatorBuilder: (_, __) => const Divider(),
                    itemBuilder: (context, index) {
                      final p = payments[index];
                      return ListTile(
                        title: Text(p['type'] ?? 'Payment'),
                        subtitle:
                            Text('${p['month'] ?? ''} • ${p['status'] ?? ''}'),
                        trailing: Text(p['amount']?.toString() ?? ''),
                        onTap: () => _toggleStatus(p),
                      );
                    },
                  );
                },
              ),
            )
          ],
        ),
      ),
    );
  }
}
