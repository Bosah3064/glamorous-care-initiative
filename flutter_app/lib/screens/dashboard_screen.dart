import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../app_colors.dart';
import '../services/supabase_service.dart';
import '../widgets/virtual_card.dart';
import '../widgets/summary_card.dart';
import 'payment_history_screen.dart';
import 'settings_screen.dart';

class DashboardScreen extends StatefulWidget {
  static const route = '/dashboard';
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;
  bool _isLoading = true;
  bool _balancesVisible = true;
  Map<String, dynamic>? _member;
  List<Map<String, dynamic>> _payments = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final member = await SupabaseService.fetchCurrentMember();
      List<Map<String, dynamic>> payments = [];
      if (member != null) {
        payments = await SupabaseService.fetchMemberPayments(member['id']);
      }
      if (mounted) {
        setState(() {
          _member = member;
          _payments = payments;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  double get _totalPaid {
    return _payments
        .where((p) => (p['status'] ?? '').toString().toLowerCase() == 'paid')
        .fold(0.0, (sum, p) => sum + (num.tryParse(p['amount']?.toString() ?? '0')?.toDouble() ?? 0));
  }

  double get _totalPending {
    return _payments
        .where((p) => (p['status'] ?? '').toString().toLowerCase() != 'paid')
        .fold(0.0, (sum, p) => sum + (num.tryParse(p['amount']?.toString() ?? '0')?.toDouble() ?? 0));
  }

  double get _totalSavings {
    return _payments
        .where((p) => (p['payment_type'] ?? p['type'] ?? '').toString().toLowerCase().contains('saving'))
        .where((p) => (p['status'] ?? '').toString().toLowerCase() == 'paid')
        .fold(0.0, (sum, p) => sum + (num.tryParse(p['amount']?.toString() ?? '0')?.toDouble() ?? 0));
  }

  String get _memberName => _member?['full_name'] ?? 'Member';
  String get _firstName => _memberName.split(' ').first;
  String get _memberNumber => _member?['member_number']?.toString() ?? _member?['id']?.toString() ?? '00000000';
  String get _memberSince {
    final joinDate = _member?['join_date'];
    if (joinDate == null) return 'N/A';
    try {
      final dt = DateTime.parse(joinDate.toString());
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${months[dt.month - 1]} ${dt.year}';
    } catch (_) {
      return 'N/A';
    }
  }

  String get _initials {
    final parts = _memberName.split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    return parts[0].substring(0, parts[0].length >= 2 ? 2 : 1).toUpperCase();
  }

  List<Map<String, dynamic>> get _recentPayments {
    final sorted = List<Map<String, dynamic>>.from(_payments);
    sorted.sort((a, b) {
      final da = DateTime.tryParse(a['payment_date']?.toString() ?? '') ?? DateTime(2000);
      final db = DateTime.tryParse(b['payment_date']?.toString() ?? '') ?? DateTime(2000);
      return db.compareTo(da);
    });
    return sorted.take(5).toList();
  }

  void _onNavTap(int index) {
    if (index == _currentIndex) return;
    setState(() => _currentIndex = index);
    switch (index) {
      case 1:
        Navigator.pushNamed(context, PaymentHistoryScreen.route).then((_) {
          setState(() => _currentIndex = 0);
        });
        break;
      case 2:
        Navigator.pushNamed(context, SettingsScreen.route).then((_) {
          setState(() => _currentIndex = 0);
        });
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: _loadData,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                slivers: [
                  // --- Custom App Bar ---
                  SliverToBoxAdapter(
                    child: SafeArea(
                      bottom: false,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                        child: Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [AppColors.primary, AppColors.purple],
                                ),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Center(
                                child: Text(
                                  _initials,
                                  style: GoogleFonts.outfit(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Hello, $_firstName \u{1F44B}',
                                    style: GoogleFonts.outfit(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Welcome back to your dashboard',
                                    style: GoogleFonts.outfit(
                                      fontSize: 13,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.04),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: IconButton(
                                icon: const Icon(Icons.notifications_outlined, color: AppColors.textSecondary),
                                onPressed: () {},
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // --- Virtual Card ---
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                      child: VirtualCard(
                        memberName: _memberName,
                        memberNumber: _memberNumber,
                        memberSince: _memberSince,
                        totalPaid: _totalPaid,
                        outstanding: _totalPending,
                        balancesVisible: _balancesVisible,
                        onToggleBalances: () {
                          setState(() => _balancesVisible = !_balancesVisible);
                        },
                      ),
                    ),
                  ),

                  // --- Summary Stats ---
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                      child: Text(
                        'Overview',
                        style: GoogleFonts.outfit(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
                      child: Row(
                        children: [
                          Expanded(
                            child: SummaryCard(
                              title: 'Total Paid',
                              amount: _balancesVisible ? 'KES ${_totalPaid.toStringAsFixed(0)}' : '****',
                              icon: Icons.check_circle_rounded,
                              color: AppColors.success,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: SummaryCard(
                              title: 'Pending',
                              amount: _balancesVisible ? 'KES ${_totalPending.toStringAsFixed(0)}' : '****',
                              icon: Icons.pending_actions_rounded,
                              color: AppColors.warning,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
                      child: SummaryCard(
                        title: 'Total Savings',
                        amount: _balancesVisible ? 'KES ${_totalSavings.toStringAsFixed(0)}' : '****',
                        icon: Icons.savings_rounded,
                        color: AppColors.primary,
                      ),
                    ),
                  ),

                  // --- Recent Payments ---
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 28, 20, 14),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Recent Payments',
                            style: GoogleFonts.outfit(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          GestureDetector(
                            onTap: () => Navigator.pushNamed(context, PaymentHistoryScreen.route),
                            child: Text(
                              'See All',
                              style: GoogleFonts.outfit(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  if (_recentPayments.isEmpty)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                        child: Container(
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFFF3F4F6)),
                          ),
                          child: Column(
                            children: [
                              Icon(Icons.receipt_long_rounded, size: 48, color: AppColors.textMuted),
                              const SizedBox(height: 12),
                              Text(
                                'No payments yet',
                                style: GoogleFonts.outfit(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Your payment history will appear here',
                                style: GoogleFonts.outfit(fontSize: 13, color: AppColors.textMuted),
                              ),
                            ],
                          ),
                        ),
                      ),
                    )
                  else
                    SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final p = _recentPayments[index];
                          final status = (p['status'] ?? 'pending').toString().toLowerCase();
                          final amount = num.tryParse(p['amount']?.toString() ?? '0')?.toDouble() ?? 0;
                          final month = p['month'] ?? '-';
                          final date = p['payment_date'] ?? '';
                          final type = p['payment_type'] ?? p['type'] ?? 'Payment';

                          Color statusColor;
                          IconData statusIcon;
                          if (status == 'paid') {
                            statusColor = AppColors.success;
                            statusIcon = Icons.check_circle_rounded;
                          } else if (status == 'late') {
                            statusColor = AppColors.error;
                            statusIcon = Icons.warning_rounded;
                          } else {
                            statusColor = AppColors.warning;
                            statusIcon = Icons.schedule_rounded;
                          }

                          String formattedDate = '-';
                          try {
                            final dt = DateTime.parse(date.toString());
                            formattedDate = '${dt.day}/${dt.month}/${dt.year}';
                          } catch (_) {}

                          return Padding(
                            padding: EdgeInsets.fromLTRB(20, 0, 20, index == _recentPayments.length - 1 ? 100 : 10),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(color: const Color(0xFFF3F4F6)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 44,
                                    height: 44,
                                    decoration: BoxDecoration(
                                      color: statusColor.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: Icon(statusIcon, color: statusColor, size: 22),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          month.toString(),
                                          style: GoogleFonts.outfit(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 15,
                                            color: AppColors.textPrimary,
                                          ),
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          '$type \u2022 $formattedDate',
                                          style: GoogleFonts.outfit(
                                            fontSize: 12,
                                            color: AppColors.textMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        'KES ${amount.toStringAsFixed(0)}',
                                        style: GoogleFonts.outfit(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 15,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 3),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: statusColor.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          status.toUpperCase(),
                                          style: GoogleFonts.outfit(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                            color: statusColor,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                        childCount: _recentPayments.length,
                      ),
                    ),
                ],
              ),
            ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(Icons.home_rounded, 'Home', 0),
                _buildNavItem(Icons.receipt_long_rounded, 'Payments', 1),
                _buildNavItem(Icons.settings_rounded, 'Settings', 2),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index) {
    final isSelected = _currentIndex == index;
    return GestureDetector(
      onTap: () => _onNavTap(index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withOpacity(0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSelected ? AppColors.primary : AppColors.textMuted,
              size: 24,
            ),
            if (isSelected) ...[
              const SizedBox(width: 8),
              Text(
                label,
                style: GoogleFonts.outfit(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
