import 'package:flutter/material.dart';
import '../models/payment_record.dart';
import '../app_colors.dart';

class PaymentHistoryScreen extends StatelessWidget {
  static const route = '/payments';
  const PaymentHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final payments = const [
      PaymentRecord(
          month: 'Jul 2026',
          amount: 'KES 600',
          status: 'Paid',
          type: 'Registration'),
      PaymentRecord(
          month: 'Jun 2026',
          amount: 'KES 0',
          status: 'Pending',
          type: 'Monthly Saving'),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Payment History')),
      body: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: payments.length,
        itemBuilder: (context, index) {
          final payment = payments[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 16),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            child: ListTile(
              contentPadding:
                  const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
              leading: CircleAvatar(
                backgroundColor: payment.status == 'Paid'
                    ? AppColors.primary
                    : AppColors.purple,
                child: const Icon(Icons.payments, color: Colors.white),
              ),
              title: Text(payment.month,
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('${payment.type} • ${payment.status}'),
              trailing: Text(payment.amount,
                  style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          );
        },
      ),
    );
  }
}
