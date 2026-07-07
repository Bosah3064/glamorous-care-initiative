import 'package:flutter/material.dart';
import '../app_colors.dart';

class AppBranding extends StatelessWidget {
  const AppBranding({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          height: 54,
          width: 54,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: Image.asset(
              'assets/logo.png',
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.primary, AppColors.purple],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Center(
                  child: Text('GC',
                      style: TextStyle(
                          color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text('Glamorous Care',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              Text('Member Portal',
                  style: TextStyle(fontSize: 14, color: Colors.black54)),
              SizedBox(height: 4),
              Text(
                'Designed by LameckTech • 0790397468 • Lame3064@gmail.com',
                style: TextStyle(fontSize: 11, color: Colors.black54),
              ),
            ],
          ),
        )
      ],
    );
  }
}
