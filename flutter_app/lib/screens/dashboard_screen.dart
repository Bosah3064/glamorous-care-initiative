import 'package:flutter/material.dart';
import '../app_colors.dart';
import '../widgets/app_branding.dart';
import '../widgets/summary_card.dart';
import '../widgets/action_tile.dart';
import 'payment_history_screen.dart';
import 'admin_panel_screen.dart';

class DashboardScreen extends StatelessWidget {
  static const route = '/dashboard';
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.admin_panel_settings_outlined),
            onPressed: () =>
                Navigator.pushNamed(context, AdminPanelScreen.route),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const AppBranding(),
              const SizedBox(height: 24),
              const Text('Hello, Lameck',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              const Text('Here is your payment summary and recent activity.',
                  style: TextStyle(color: Colors.black54)),
              const SizedBox(height: 24),
              Row(
                children: const [
                  Expanded(
                      child: SummaryCard(
                          title: 'Paid',
                          amount: 'KES 600',
                          icon: Icons.check_circle,
                          color: AppColors.primary)),
                  SizedBox(width: 16),
                  Expanded(
                      child: SummaryCard(
                          title: 'Pending',
                          amount: '0',
                          icon: Icons.pending_actions,
                          color: AppColors.purple)),
                ],
              ),
              const SizedBox(height: 16),
              const SummaryCard(
                  title: 'Total Savings',
                  amount: 'KES 0',
                  icon: Icons.savings,
                  color: AppColors.red),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () =>
                    Navigator.pushNamed(context, PaymentHistoryScreen.route),
                child: const Text('View Payment History'),
              ),
              const SizedBox(height: 16),
              Card(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18)),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('Quick actions',
                          style: TextStyle(
                              fontSize: 18, fontWeight: FontWeight.bold)),
                      SizedBox(height: 14),
                      ActionTile(
                          icon: Icons.person_add_alt_1, label: 'Add Member'),
                      ActionTile(icon: Icons.payment, label: 'Record Payment'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
