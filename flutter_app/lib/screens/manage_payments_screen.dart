import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../app_colors.dart';
import '../services/supabase_service.dart';

class ManagePaymentsScreen extends StatefulWidget {
  static const route = '/manage-payments';
  const ManagePaymentsScreen({super.key});

  @override
  State<ManagePaymentsScreen> createState() => _ManagePaymentsScreenState();
}

class _ManagePaymentsScreenState extends State<ManagePaymentsScreen> {
  List<Map<String, dynamic>> _payments = [];
  List<Map<String, dynamic>> _members = [];
  bool _isLoading = true;
  String _selectedFilter = 'All';
  String _searchQuery = '';

  static const _months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final payments = await SupabaseService.adminFetchAllPayments();
      final members = await SupabaseService.adminFetchAllMembers();
      if (mounted) {
        setState(() {
          _payments = payments;
          _members = members;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  List<Map<String, dynamic>> get _filteredPayments {
    var list = _payments;
    // Filter by status
    if (_selectedFilter != 'All') {
      list = list.where((p) => (p['status']?.toString().toLowerCase() ?? '') == _selectedFilter.toLowerCase()).toList();
    }
    // Filter by search
    if (_searchQuery.isNotEmpty) {
      list = list.where((p) {
        final memberName = (p['members'] as Map?)?['full_name']?.toString().toLowerCase() ?? '';
        final month = p['month']?.toString().toLowerCase() ?? '';
        return memberName.contains(_searchQuery.toLowerCase()) || month.contains(_searchQuery.toLowerCase());
      }).toList();
    }
    return list;
  }

  // Generate pending payments for all active members for the current month
  Future<void> _generateMonthlyPending() async {
    final now = DateTime.now();
    final currentMonth = '${_months[now.month - 1]} ${now.year}';

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Generate Pending Payments', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.08),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  const Icon(Icons.calendar_month, color: AppColors.primary),
                  const SizedBox(width: 12),
                  Text(currentMonth, style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.primary)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'This will create "Pending" payment entries for all active members who don\'t already have a payment for $currentMonth.',
              style: GoogleFonts.outfit(color: AppColors.textSecondary, fontSize: 13),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Generate', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      final activeMembers = _members.where((m) => (m['status']?.toString().toLowerCase() ?? '') == 'active').toList();

      // Find who already has a payment for this month
      final existingMemberIds = _payments
          .where((p) => (p['month']?.toString() ?? '').toLowerCase() == currentMonth.toLowerCase())
          .map((p) => p['member_id']?.toString())
          .toSet();

      int created = 0;
      for (final member in activeMembers) {
        final memberId = member['id']?.toString();
        if (memberId != null && !existingMemberIds.contains(memberId)) {
          await SupabaseService.adminAddPayment({
            'member_id': memberId,
            'member_name': member['full_name'] ?? 'Unknown',
            'amount': 0,
            'month': currentMonth,
            'payment_type': 'Monthly Contribution',
            'status': 'pending',
            'payment_date': now.toIso8601String(),
          });
          created++;
        }
      }

      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Created $created pending payment(s) for $currentMonth'),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  Future<void> _exportPayments() async {
    try {
      final List<String> csvRows = ['Name,Month,Amount,Type,Status,Date'];
      for (var p in _filteredPayments) {
        final name = (p['members'] as Map?)?['full_name']?.toString() ?? p['member_name']?.toString() ?? 'Unknown';
        final month = p['month']?.toString() ?? '';
        final amount = p['amount']?.toString() ?? '0';
        final type = (p['payment_type'] ?? p['type'])?.toString() ?? '';
        final status = p['status']?.toString() ?? '';
        final date = p['payment_date']?.toString() ?? '';
        
        final safeName = name.replaceAll('"', '""');
        csvRows.add('"$safeName","$month","$amount","$type","$status","$date"');
      }
      
      final csvString = csvRows.join('\n');
      final directory = await getApplicationDocumentsDirectory();
      final file = File('${directory.path}/payments_export.csv');
      await file.writeAsString(csvString);
      
      await Share.shareXFiles([XFile(file.path)], text: 'Glamorous Care Payments Export');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Export error: $e')));
    }
  }

  // Quick action: Mark a payment as Paid
  Future<void> _markAsPaid(Map<String, dynamic> payment) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) {
        final amountController = TextEditingController(text: payment['amount']?.toString() ?? '0');
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Confirm Payment', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                (payment['members'] as Map?)?['full_name']?.toString() ?? 'Member',
                style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              Text(payment['month']?.toString() ?? '', style: GoogleFonts.outfit(color: AppColors.textSecondary)),
              const SizedBox(height: 16),
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Amount Paid (KES)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixText: 'KES ',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.success,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () async {
                final amount = double.tryParse(amountController.text) ?? 0;
                if (amount <= 0) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a valid amount')));
                  return;
                }
                Navigator.pop(context, true);
                setState(() => _isLoading = true);
                try {
                  await SupabaseService.adminUpdatePayment(payment['id'], {
                    'status': 'paid',
                    'amount': amount,
                    'payment_date': DateTime.now().toIso8601String(),
                  });
                  await _loadData();
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('✅ Payment confirmed for KES ${amount.toStringAsFixed(0)}'),
                        backgroundColor: AppColors.success,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                } catch (e) {
                  setState(() => _isLoading = false);
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                }
              },
              icon: const Icon(Icons.check_circle, color: Colors.white, size: 18),
              label: const Text('Mark as Paid', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  void _showPaymentDialog([Map<String, dynamic>? payment]) {
    final isEditing = payment != null;
    String? selectedMemberId = isEditing ? payment['member_id']?.toString() : null;
    final amountController = TextEditingController(text: isEditing ? payment['amount']?.toString() : '');
    final monthController = TextEditingController(text: isEditing ? payment['month']?.toString() : '');
    final typeController = TextEditingController(text: isEditing ? (payment['payment_type'] ?? payment['type'])?.toString() : 'Monthly Contribution');
    String status = isEditing ? payment['status']?.toString().toLowerCase() ?? 'pending' : 'pending';

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Text(isEditing ? 'Edit Payment' : 'Add Payment', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (!isEditing)
                      DropdownButtonFormField<String>(
                        value: selectedMemberId,
                        decoration: InputDecoration(labelText: 'Member', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                        items: _members.map((m) => DropdownMenuItem(
                          value: m['id'].toString(),
                          child: Text(m['full_name']?.toString() ?? 'Unknown'),
                        )).toList(),
                        onChanged: (val) => setDialogState(() => selectedMemberId = val),
                      ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: amountController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(labelText: 'Amount (KES)', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: monthController.text.isNotEmpty ? monthController.text : null,
                      decoration: InputDecoration(labelText: 'Month', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                      items: [
                        'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026',
                        'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026'
                      ].map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                      onChanged: (val) {
                        if (val != null) monthController.text = val;
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: typeController.text.isNotEmpty ? null : null,
                      decoration: InputDecoration(labelText: 'Payment Type', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                      items: const [
                        DropdownMenuItem(value: 'Monthly Contribution', child: Text('Monthly Contribution')),
                        DropdownMenuItem(value: 'Registration Fee', child: Text('Registration Fee')),
                        DropdownMenuItem(value: 'Penalty', child: Text('Penalty')),
                        DropdownMenuItem(value: 'Other', child: Text('Other')),
                      ],
                      onChanged: (val) {
                        if (val != null) typeController.text = val;
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: ['pending', 'paid', 'late'].contains(status) ? status : 'pending',
                      decoration: InputDecoration(labelText: 'Status', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                      items: const [
                        DropdownMenuItem(value: 'pending', child: Text('Pending')),
                        DropdownMenuItem(value: 'paid', child: Text('Paid')),
                        DropdownMenuItem(value: 'late', child: Text('Late')),
                      ],
                      onChanged: (val) => setDialogState(() => status = val!),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () async {
                    if (!isEditing && selectedMemberId == null) return;
                    final data = {
                      if (!isEditing) 'member_id': selectedMemberId,
                      if (!isEditing) 'member_name': _members.firstWhere((m) => m['id'] == selectedMemberId, orElse: () => {})['full_name'] ?? 'Unknown',
                      'amount': double.tryParse(amountController.text) ?? 0.0,
                      'month': monthController.text,
                      'payment_type': typeController.text,
                      'status': status,
                      if (!isEditing) 'payment_date': DateTime.now().toIso8601String(),
                    };
                    Navigator.pop(context);
                    setState(() => _isLoading = true);
                    try {
                      if (isEditing) {
                        await SupabaseService.adminUpdatePayment(payment['id'], data);
                      } else {
                        await SupabaseService.adminAddPayment(data);
                      }
                      await _loadData();
                    } catch (e) {
                      setState(() => _isLoading = false);
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                    }
                  },
                  child: Text(isEditing ? 'Save' : 'Add Payment', style: const TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _deletePayment(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Delete Payment'),
        content: const Text('Are you sure? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isLoading = true);
      try {
        await SupabaseService.adminDeletePayment(id);
        await _loadData();
      } catch (e) {
        setState(() => _isLoading = false);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final payments = _filteredPayments;
    // Summary counts
    final pendingCount = _payments.where((p) => (p['status']?.toString().toLowerCase() ?? '') == 'pending').length;
    final paidCount = _payments.where((p) => (p['status']?.toString().toLowerCase() ?? '') == 'paid').length;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Manage Payments', style: GoogleFonts.outfit(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.download_rounded, color: AppColors.primary),
            onPressed: _exportPayments,
            tooltip: 'Export CSV',
          ),
          IconButton(
            icon: const Icon(Icons.calendar_month_rounded, color: AppColors.primary),
            onPressed: _generateMonthlyPending,
            tooltip: 'Generate Monthly Pending',
          ),
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded, color: AppColors.primary),
            onPressed: () => _showPaymentDialog(),
            tooltip: 'Add Payment',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : Column(
              children: [
                // Summary bar
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                  child: Row(
                    children: [
                      _buildStatBadge('Pending', pendingCount, AppColors.warning),
                      const SizedBox(width: 10),
                      _buildStatBadge('Paid', paidCount, AppColors.success),
                      const SizedBox(width: 10),
                      _buildStatBadge('Total', _payments.length, AppColors.primary),
                    ],
                  ),
                ),

                // Search
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                  child: TextField(
                    onChanged: (val) => setState(() => _searchQuery = val),
                    decoration: InputDecoration(
                      hintText: 'Search by name or month...',
                      hintStyle: GoogleFonts.outfit(color: AppColors.textMuted, fontSize: 13),
                      prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.textMuted),
                      filled: true,
                      fillColor: AppColors.background,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      isDense: true,
                    ),
                  ),
                ),

                // Filter chips
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: ['All', 'Pending', 'Paid', 'Late'].map((filter) {
                        final isSelected = _selectedFilter == filter;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            label: Text(filter, style: GoogleFonts.outfit(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isSelected ? Colors.white : AppColors.textSecondary,
                            )),
                            selected: isSelected,
                            onSelected: (_) => setState(() => _selectedFilter = filter),
                            backgroundColor: Colors.white,
                            selectedColor: AppColors.primary,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                            side: BorderSide(color: isSelected ? AppColors.primary : Colors.grey.shade200),
                            showCheckmark: false,
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),

                // Payments list
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _loadData,
                    child: payments.isEmpty
                        ? Center(child: Text('No payments found', style: GoogleFonts.outfit(color: AppColors.textMuted)))
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                            itemCount: payments.length,
                            itemBuilder: (context, index) {
                              final payment = payments[index];
                              final amount = num.tryParse(payment['amount']?.toString() ?? '0') ?? 0;
                              final month = payment['month']?.toString() ?? '';
                              final status = payment['status']?.toString().toLowerCase() ?? 'pending';
                              final type = (payment['payment_type'] ?? payment['type'])?.toString() ?? '';
                              final memberName = (payment['members'] as Map?)?['full_name']?.toString() ?? 'Unknown';
                              final isPending = status == 'pending';
                              final isPaid = status == 'paid';

                              Color statusColor = AppColors.warning;
                              IconData statusIcon = Icons.pending_actions;
                              if (isPaid) { statusColor = AppColors.success; statusIcon = Icons.check_circle; }
                              if (status == 'late') { statusColor = AppColors.error; statusIcon = Icons.warning_rounded; }

                              final isRegistration = type.toLowerCase().contains('registration') || type.toLowerCase().contains('reg');

                              return Card(
                                margin: const EdgeInsets.only(bottom: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                elevation: 0,
                                color: Colors.white,
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Header row
                                      Row(
                                        children: [
                                          CircleAvatar(
                                            radius: 18,
                                            backgroundColor: statusColor.withOpacity(0.1),
                                            child: Icon(statusIcon, color: statusColor, size: 18),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(memberName, style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 14)),
                                                Text(month, style: GoogleFonts.outfit(color: AppColors.textSecondary, fontSize: 12)),
                                              ],
                                            ),
                                          ),
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.end,
                                            children: [
                                              Text(
                                                amount > 0 ? 'KES ${amount.toStringAsFixed(0)}' : 'KES --',
                                                style: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 15, color: isPaid ? AppColors.success : AppColors.textPrimary),
                                              ),
                                              const SizedBox(height: 4),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                decoration: BoxDecoration(
                                                  color: statusColor.withOpacity(0.1),
                                                  borderRadius: BorderRadius.circular(6),
                                                ),
                                                child: Text(
                                                  status.toUpperCase(),
                                                  style: TextStyle(color: statusColor, fontSize: 9, fontWeight: FontWeight.bold),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),

                                      // Type tag + actions
                                      const SizedBox(height: 10),
                                      Row(
                                        children: [
                                          if (isRegistration)
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                              decoration: BoxDecoration(
                                                color: AppColors.purple.withOpacity(0.1),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text('REGISTRATION', style: TextStyle(color: AppColors.purple, fontSize: 9, fontWeight: FontWeight.bold)),
                                            )
                                          else
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                              decoration: BoxDecoration(
                                                color: AppColors.primary.withOpacity(0.1),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(type.toUpperCase(), style: TextStyle(color: AppColors.primary, fontSize: 9, fontWeight: FontWeight.bold)),
                                            ),
                                          const Spacer(),
                                          // Quick "Mark as Paid" button for pending
                                          if (isPending)
                                            SizedBox(
                                              height: 30,
                                              child: ElevatedButton.icon(
                                                style: ElevatedButton.styleFrom(
                                                  backgroundColor: AppColors.success,
                                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                                  padding: const EdgeInsets.symmetric(horizontal: 10),
                                                ),
                                                onPressed: () => _markAsPaid(payment),
                                                icon: const Icon(Icons.check, color: Colors.white, size: 14),
                                                label: Text('Paid', style: GoogleFonts.outfit(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                                              ),
                                            ),
                                          const SizedBox(width: 6),
                                          // Edit
                                          SizedBox(
                                            height: 30,
                                            width: 30,
                                            child: IconButton(
                                              padding: EdgeInsets.zero,
                                              iconSize: 16,
                                              icon: const Icon(Icons.edit, color: AppColors.textMuted),
                                              onPressed: () => _showPaymentDialog(payment),
                                            ),
                                          ),
                                          // Delete
                                          SizedBox(
                                            height: 30,
                                            width: 30,
                                            child: IconButton(
                                              padding: EdgeInsets.zero,
                                              iconSize: 16,
                                              icon: const Icon(Icons.delete_outline, color: AppColors.error),
                                              onPressed: () => _deletePayment(payment['id'].toString()),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildStatBadge(String label, int count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('$count', style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: color, fontSize: 14)),
          const SizedBox(width: 4),
          Text(label, style: GoogleFonts.outfit(color: color, fontSize: 11)),
        ],
      ),
    );
  }
}
