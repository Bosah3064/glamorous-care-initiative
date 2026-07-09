import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'app_colors.dart';
import 'screens/welcome_screen.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/payment_history_screen.dart';
import 'screens/admin_panel_screen.dart';
import 'screens/manage_members_screen.dart';
import 'screens/manage_payments_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/reset_password_screen.dart';
import 'services/supabase_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Load .env (local) and prefer dart-define when provided.
  await dotenv.load();
  final supabaseUrlFromEnv = dotenv.env['SUPABASE_URL'] ?? '';
  final supabaseAnonKeyFromEnv = dotenv.env['SUPABASE_ANON_KEY'] ?? '';

  final supabaseUrl =
      const String.fromEnvironment('SUPABASE_URL', defaultValue: '').isNotEmpty
          ? const String.fromEnvironment('SUPABASE_URL')
          : supabaseUrlFromEnv;

  final supabaseAnonKey =
      const String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '')
              .isNotEmpty
          ? const String.fromEnvironment('SUPABASE_ANON_KEY')
          : supabaseAnonKeyFromEnv;

  if (supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty) {
    await SupabaseService.init(url: supabaseUrl, anonKey: supabaseAnonKey);
  }
  runApp(const GlamorousCareApp());
}

class GlamorousCareApp extends StatelessWidget {
  const GlamorousCareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Glamorous Care Initiative',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: AppColors.background,
        primaryColor: AppColors.primary,
        colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary)
            .copyWith(secondary: AppColors.purple),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: AppColors.primary,
          elevation: 0,
          centerTitle: false,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 28),
          ),
        ),
      ),
      initialRoute: WelcomeScreen.route,
      routes: {
        WelcomeScreen.route: (_) => const WelcomeScreen(),
        LoginScreen.route: (_) => const LoginScreen(),
        ResetPasswordScreen.route: (_) => const ResetPasswordScreen(),
        DashboardScreen.route: (_) => const DashboardScreen(),
        PaymentHistoryScreen.route: (_) => const PaymentHistoryScreen(),
        AdminPanelScreen.route: (_) => const AdminPanelScreen(),
        ManageMembersScreen.route: (_) => const ManageMembersScreen(),
        ManagePaymentsScreen.route: (_) => const ManagePaymentsScreen(),
        SettingsScreen.route: (_) => const SettingsScreen(),
      },
    );
  }
}
