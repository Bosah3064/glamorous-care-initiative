import 'package:flutter/material.dart';

import '../services/supabase_service.dart';

class ManageMembersScreen extends StatefulWidget {
  static const route = '/manage-members';
  const ManageMembersScreen({super.key});

  @override
  State<ManageMembersScreen> createState() => _ManageMembersScreenState();
}

class _ManageMembersScreenState extends State<ManageMembersScreen> {
  final _nameController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _addMember() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;
    await SupabaseService.addMember({'name': name});
    _nameController.clear();
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Member added')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Manage Members')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Members',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: TextField(
                    controller: _nameController,
                    decoration: const InputDecoration(hintText: 'Member name')),
              ),
              const SizedBox(width: 8),
              ElevatedButton(onPressed: _addMember, child: const Text('Add'))
            ]),
            const SizedBox(height: 12),
            Expanded(
              child: StreamBuilder<List<Map<String, dynamic>>>(
                stream: SupabaseService.membersStream(),
                builder: (context, snapshot) {
                  if (snapshot.hasError)
                    return Text('Error: ${snapshot.error}');
                  if (!snapshot.hasData)
                    return const Center(child: CircularProgressIndicator());
                  final members = snapshot.data!;
                  if (members.isEmpty)
                    return const Center(child: Text('No members yet'));
                  return ListView.separated(
                    itemCount: members.length,
                    separatorBuilder: (_, __) => const Divider(),
                    itemBuilder: (context, index) {
                      final m = members[index];
                      return ListTile(
                        title: Text(m['name'] ?? 'Unnamed'),
                        subtitle: Text('ID: ${m['id'] ?? '-'}'),
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
