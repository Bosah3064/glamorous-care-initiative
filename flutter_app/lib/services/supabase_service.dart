import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static Future<void> init({required String url, required String anonKey}) async {
    await Supabase.initialize(url: url, anonKey: anonKey);
  }

  static SupabaseClient get client => Supabase.instance.client;

  // Auth
  static User? get currentUser => client.auth.currentUser;
  static Stream<AuthState> onAuthStateChange() => client.auth.onAuthStateChange;

  static Future<void> signIn(String email, String password) async {
    await client.auth.signInWithPassword(email: email, password: password);
    if (client.auth.currentUser == null) throw Exception('Sign in failed');
  }

  static Future<void> signUp(String email, String password) async {
    await client.auth.signUp(email: email, password: password);
  }

  static Future<void> signOut() async {
    await client.auth.signOut();
  }

  static Future<void> resetPasswordForEmail(String email) async {
    await client.auth.resetPasswordForEmail(email);
  }

  // Members
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

  // Payments
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
}
