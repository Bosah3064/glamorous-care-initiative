import 'package:flutter/material.dart';
import '../app_colors.dart';
import '../widgets/app_branding.dart';
import 'login_screen.dart';

class WelcomeScreen extends StatelessWidget {
  static const route = '/';
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),
              const AppBranding(),
              const SizedBox(height: 24),
              ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: Image.asset(
                  'assets/hero.png',
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 200,
                    color: AppColors.primary.withOpacity(0.15),
                    child: Center(
                      child:
                          Icon(Icons.image, size: 60, color: AppColors.primary),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'A better way to manage members, payments, and administration.',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Fast login, payment tracking, and a clean admin experience built for Glamorous Care Initiative.',
                style: TextStyle(fontSize: 16, color: Colors.black87),
              ),
              const SizedBox(height: 32),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () =>
                          Navigator.pushNamed(context, LoginScreen.route),
                      child: const Text('Continue to Login'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
