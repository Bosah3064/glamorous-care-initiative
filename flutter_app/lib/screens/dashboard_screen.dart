import 'package:flutter/material.dart';
import '../app_colors.dart';
import '../widgets/app_branding.dart';
import '../widgets/summary_card.dart';
import '../widgets/action_tile.dart';
import 'payment_history_screen.dart';
import 'admin_panel_screen.dart';
import 'settings_screen.dart';

class DashboardScreen extends StatefulWidget {
  static const route = '/dashboard';
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;

  void _onNavTap(int index) {
    if (index == _currentIndex) return;
    setState(() => _currentIndex = index);
    if (index == 1) {
      Navigator.pushNamed(context, PaymentHistoryScreen.route);
    } else if (index == 2) {
      Navigator.pushNamed(context, AdminPanelScreen.route);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: const [
            CircleAvatar(
                backgroundColor: AppColors.purple,
                child: Icon(Icons.person, color: Colors.white, size: 18)),
            SizedBox(width: 12),
            Text('Dashboard'),
          ],
        ),
        elevation: 1,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const AppBranding(),
              const SizedBox(height: 18),
              const Text('Hello, Lameck',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              const Text('Payment summary and recent activity',
                  style: TextStyle(color: Colors.black54)),
              const SizedBox(height: 18),
              Column(
                children: const [
                  SummaryCard(
                      title: 'Paid',
                      amount: 'KES 600',
                      icon: Icons.check_circle,
                      color: AppColors.primary),
                  SizedBox(height: 12),
                  SummaryCard(
                      title: 'Pending',
                      amount: '0',
                      icon: Icons.pending_actions,
                      color: AppColors.purple),
                  SizedBox(height: 12),
                  SummaryCard(
                      title: 'Total Savings',
                      amount: 'KES 0',
                      icon: Icons.savings,
                      color: AppColors.red),
                ],
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () =>
                      Navigator.pushNamed(context, PaymentHistoryScreen.route),
                  child: const Text('View Payment History'),
                ),
              ),
              const SizedBox(height: 18),
              Card(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: const [
                      Text('Quick actions',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.bold)),
                      SizedBox(height: 8),
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
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showModalBottomSheet(
            context: context,
            builder: (_) => Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    ListTile(
                        leading: const Icon(Icons.person_add),
                        title: const Text('Add Member')),
                    ListTile(
                        leading: const Icon(Icons.payment),
                        title: const Text('Record Payment')),
                  ]),
                )),
        label: const Text('Actions'),
        icon: const Icon(Icons.add),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: _onNavTap,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.payment), label: 'Payments'),
          BottomNavigationBarItem(
              icon: Icon(Icons.admin_panel_settings), label: 'Admin'),
        ],
      ),
    );
  }
}
