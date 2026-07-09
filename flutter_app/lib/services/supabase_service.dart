import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SupabaseService {
  static Future<void> init({required String url, required String anonKey}) async {
    await Supabase.initialize(url: url, anonKey: anonKey);
  }

  static SupabaseClient get client => Supabase.instance.client;

  // ─── Auth ───────────────────────────────────────────────────────────

  static User? get currentUser => client.auth.currentUser;
  static Stream<AuthState> onAuthStateChange() => client.auth.onAuthStateChange;

  static Future<void> _recordLoginTime() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('last_login_time', DateTime.now().millisecondsSinceEpoch);
  }

  static Future<bool> isSessionValid() async {
    if (currentUser == null) return false;
    final prefs = await SharedPreferences.getInstance();
    final lastLoginMs = prefs.getInt('last_login_time');
    if (lastLoginMs == null) return false;

    final lastLogin = DateTime.fromMillisecondsSinceEpoch(lastLoginMs);
    final diff = DateTime.now().difference(lastLogin);
    // If it's been more than 3 days, session is invalid
    if (diff.inDays >= 3) {
      await signOut();
      return false;
    }
    return true;
  }

  static Future<void> signIn(String email, String password) async {
    await client.auth.signInWithPassword(email: email, password: password);
    if (client.auth.currentUser == null) throw Exception('Sign in failed');
    await _recordLoginTime();
  }

  static Future<void> signUp(String fullName, String email, String password) async {
    final response = await client.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': fullName},
    );
    
    final user = response.user;
    if (user != null) {
      // Insert into members table (same as the website portal does).
      // Uses upsert so it won't crash if the DB trigger already created the row.
      await client.from('members').upsert({
        'id': user.id,
        'full_name': fullName,
        'email': email,
        'role': 'member',
        'status': 'active',
        'requires_password_reset': false,
        'form_details': {},
      }, onConflict: 'id');
      await _recordLoginTime();
    } else {
      throw Exception('Sign up failed');
    }
  }

  static Future<void> signOut() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('last_login_time');
    await client.auth.signOut();
  }

  static Future<void> resetPasswordForEmail(String email) async {
    await client.auth.resetPasswordForEmail(email);
  }

  // ─── Members ────────────────────────────────────────────────────────

  static Stream<List<Map<String, dynamic>>> membersStream() {
    return client.from('members').stream(primaryKey: ['id']).order('created_at');
  }

  static Future<List<Map<String, dynamic>>> fetchMembers() async {
    final res = await client.from('members').select().order('created_at');
    return List<Map<String, dynamic>>.from(res as List);
  }

  static Future<Map<String, dynamic>?> fetchCurrentMember() async {
    final user = currentUser;
    if (user == null) return null;
    try {
      final res = await client.from('members').select().eq('id', user.id).single();
      return res;
    } catch (_) {
      return null;
    }
  }

  static Future<void> addMember(Map<String, dynamic> data) async {
    await client.from('members').insert(data);
  }

  static Future<void> updateMember(String id, Map<String, dynamic> changes) async {
    await client.from('members').update(changes).eq('id', id);
  }

  // ─── Card Theme ─────────────────────────────────────────────────────

  /// Updates the current user's `form_details` JSONB column to include
  /// a `card_theme` key. Reads existing form_details first, merges the
  /// new theme index, then writes back.
  static Future<void> updateCardTheme(int themeIndex) async {
    final user = currentUser;
    if (user == null) throw Exception('No authenticated user');

    // Read existing form_details so we don't overwrite other keys.
    final row = await client
        .from('members')
        .select('form_details')
        .eq('id', user.id)
        .single();

    final existing = (row['form_details'] as Map<String, dynamic>?) ?? {};
    final merged = {...existing, 'card_theme': themeIndex};

    await client
        .from('members')
        .update({'form_details': merged}).eq('id', user.id);
  }

  // ─── Payments ───────────────────────────────────────────────────────

  static Stream<List<Map<String, dynamic>>> paymentsStream() {
    return client.from('payments').stream(primaryKey: ['id']).order('created_at');
  }

  static Future<List<Map<String, dynamic>>> fetchPayments() async {
    final res = await client.from('payments').select().order('created_at');
    return List<Map<String, dynamic>>.from(res as List);
  }

  static Future<List<Map<String, dynamic>>> fetchMemberPayments(String memberId) async {
    final res = await client
        .from('payments')
        .select()
        .eq('member_id', memberId)
        .order('payment_date', ascending: false);
    return List<Map<String, dynamic>>.from(res as List);
  }

  static Future<void> updatePayment(String id, Map<String, dynamic> changes) async {
    await client.from('payments').update(changes).eq('id', id);
  }

  // ─── Notifications ─────────────────────────────────────────────────

  /// Fetches all notifications for [memberId], newest first.
  static Future<List<Map<String, dynamic>>> fetchNotifications(
      String memberId) async {
    final res = await client
        .from('notifications')
        .select()
        .eq('member_id', memberId)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res as List);
  }

  /// Marks a single notification as read.
  static Future<void> markNotificationRead(String notificationId) async {
    await client
        .from('notifications')
        .update({'is_read': true}).eq('id', notificationId);
  }

  /// Returns the count of unread notifications for [memberId].
  static Future<int> countUnreadNotifications(String memberId) async {
    final result = await client
        .from('notifications')
        .select()
        .eq('member_id', memberId)
        .eq('is_read', false)
        .count(CountOption.exact);
    return result.count;
  }

  /// Real-time stream of notifications for [memberId].
  static Stream<List<Map<String, dynamic>>> notificationsStream(
      String memberId) {
    return client
        .from('notifications')
        .stream(primaryKey: ['id'])
        .eq('member_id', memberId)
        .order('created_at', ascending: false);
  }

  // ─── Admin Tools ──────────────────────────────────────────────

  static Future<List<Map<String, dynamic>>> adminFetchAllMembers() async {
    final response = await client
        .from('members')
        .select('*')
        .order('full_name', ascending: true);
    return List<Map<String, dynamic>>.from(response);
  }

  static Future<void> adminUpdateMember(String id, Map<String, dynamic> data) async {
    await client.from('members').update(data).eq('id', id);
  }

  static Future<List<Map<String, dynamic>>> adminFetchAllPayments() async {
    final response = await client
        .from('payments')
        .select('*, members(full_name, email)')
        .order('payment_date', ascending: false);
    return List<Map<String, dynamic>>.from(response);
  }

  static Future<void> adminAddPayment(Map<String, dynamic> data) async {
    await client.from('payments').insert(data);
  }

  static Future<void> adminUpdatePayment(String id, Map<String, dynamic> data) async {
    await client.from('payments').update(data).eq('id', id);
  }

  static Future<void> adminDeletePayment(String id) async {
    await client.from('payments').delete().eq('id', id);
  }
}
