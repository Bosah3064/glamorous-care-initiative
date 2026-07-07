import 'package:flutter/material.dart';
import '../app_colors.dart';

class ResetPasswordScreen extends StatefulWidget {
  static const route = '/reset-password';
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final newPasswordController = TextEditingController();
  final confirmPasswordController = TextEditingController();
  bool isLoading = false;
  bool showPassword = false;
  bool showConfirmPassword = false;
  String strengthLabel = '';
  int strengthLevel = 0;
  String matchMessage = '';
  Color matchColor = Colors.black54;

  void updateStrength(String password) {
    var strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 10) strength += 1;
    if (RegExp(r'[A-Z]').hasMatch(password)) strength += 1;
    if (RegExp(r'[0-9]').hasMatch(password)) strength += 1;
    if (RegExp(r'[^A-Za-z0-9]').hasMatch(password)) strength += 1;
    if (strength > 4) strength = 4;

    final label = strength == 0
        ? ''
        : strength == 1
            ? 'Weak'
            : strength == 2
                ? 'Fair'
                : strength == 3
                    ? 'Good'
                    : 'Strong';

    setState(() {
      strengthLevel = strength;
      strengthLabel = label;
    });
  }

  void checkMatch() {
    final pwd1 = newPasswordController.text;
    final pwd2 = confirmPasswordController.text;

    if (pwd2.isEmpty) {
      setState(() {
        matchMessage = '';
      });
      return;
    }

    if (pwd1 == pwd2) {
      setState(() {
        matchMessage = 'Passwords match';
        matchColor = Colors.green;
      });
    } else {
      setState(() {
        matchMessage = 'Passwords do not match';
        matchColor = Colors.red;
      });
    }
  }

  void resetPassword() async {
    final newPassword = newPasswordController.text;
    final confirmPassword = confirmPasswordController.text;

    if (newPassword.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Password must be at least 6 characters.')));
      return;
    }

    if (newPassword != confirmPassword) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Passwords do not match.')));
      return;
    }

    setState(() => isLoading = true);
    await Future.delayed(const Duration(milliseconds: 600));
    setState(() => isLoading = false);

    if (!mounted) return;

    Navigator.pushReplacementNamed(context, '/dashboard');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Reset Password')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Set a strong password',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),
              const Text(
                'Use a secure password and confirm it before continuing.',
                style: TextStyle(color: Colors.black54),
              ),
              const SizedBox(height: 32),
              TextField(
                controller: newPasswordController,
                obscureText: !showPassword,
                onChanged: (value) {
                  updateStrength(value);
                  checkMatch();
                },
                decoration: InputDecoration(
                  labelText: 'New Password',
                  prefixIcon: const Icon(Icons.lock),
                  suffixIcon: IconButton(
                    icon: Icon(
                        showPassword ? Icons.visibility_off : Icons.visibility),
                    onPressed: () =>
                        setState(() => showPassword = !showPassword),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              PasswordStrengthMeter(level: strengthLevel, label: strengthLabel),
              const SizedBox(height: 20),
              TextField(
                controller: confirmPasswordController,
                obscureText: !showConfirmPassword,
                onChanged: (_) => checkMatch(),
                decoration: InputDecoration(
                  labelText: 'Confirm Password',
                  prefixIcon: const Icon(Icons.lock),
                  suffixIcon: IconButton(
                    icon: Icon(showConfirmPassword
                        ? Icons.visibility_off
                        : Icons.visibility),
                    onPressed: () => setState(
                        () => showConfirmPassword = !showConfirmPassword),
                  ),
                ),
              ),
              if (matchMessage.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(matchMessage, style: TextStyle(color: matchColor)),
              ],
              const SizedBox(height: 28),
              ElevatedButton(
                onPressed: isLoading ? null : resetPassword,
                child: isLoading
                    ? const SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2.5),
                      )
                    : const Text('Reset Password'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class PasswordStrengthMeter extends StatelessWidget {
  final int level;
  final String label;

  const PasswordStrengthMeter(
      {super.key, required this.level, required this.label});

  Color get color {
    if (level <= 1) return Colors.red;
    if (level == 2) return Colors.amber;
    if (level == 3) return Colors.green;
    return Colors.green.shade800;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: List.generate(4, (index) {
            return Expanded(
              child: Container(
                height: 8,
                margin: const EdgeInsets.only(right: 6),
                decoration: BoxDecoration(
                  color: index < level ? color : Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 8),
        Text(label,
            style: TextStyle(color: color, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
