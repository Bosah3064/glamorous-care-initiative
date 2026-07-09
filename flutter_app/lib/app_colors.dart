import 'package:flutter/material.dart';

class AppColors {
  // Brand colors
  static const primary = Color(0xFF1d5f99);
  static const purple = Color(0xFF683669);
  static const red = Color(0xFFa5243d);
  
  // Background
  static const background = Color(0xFFF8F9FB);
  static const surface = Color(0xFFFFFFFF);
  
  // Text
  static const textPrimary = Color(0xFF111827);
  static const textSecondary = Color(0xFF6B7280);
  static const textMuted = Color(0xFF9CA3AF);
  
  // Status
  static const success = Color(0xFF16A34A);
  static const warning = Color(0xFFF59E0B);
  static const error = Color(0xFFEF4444);
  
  // Card gradient
  static const cardGradient = LinearGradient(
    colors: [primary, purple, red],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
