import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'screens/welcome_screen.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/payment_history_screen.dart';
import 'screens/admin_panel_screen.dart';
import 'screens/reset_password_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // TODO: Initialize Supabase with your project details.
  // await Supabase.initialize(url: 'YOUR_SUPABASE_URL', anonKey: 'YOUR_SUPABASE_ANON_KEY');
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
      },
    );
  }
}
