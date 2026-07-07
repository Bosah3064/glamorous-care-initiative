import 'package:flutter/material.dart';
import '../widgets/action_tile.dart';

class AdminPanelScreen extends StatelessWidget {
  static const route = '/admin';
  const AdminPanelScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Admin Panel')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: const [
            Text('Admin actions',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            SizedBox(height: 18),
            ActionTile(icon: Icons.group, label: 'Manage Members'),
            ActionTile(icon: Icons.receipt_long, label: 'Manage Payments'),
            ActionTile(icon: Icons.file_upload, label: 'Import Data'),
          ],
        ),
      ),
    );
  }
}
