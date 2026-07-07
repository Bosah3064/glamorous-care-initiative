import 'package:flutter/material.dart';
import '../app_colors.dart';

class ActionTile extends StatelessWidget {
  final IconData icon;
  final String label;

  const ActionTile({
    super.key,
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            decoration: BoxDecoration(
              color: AppColors.primary.withAlpha(31),
              borderRadius: BorderRadius.circular(14),
            ),
            padding: const EdgeInsets.all(10),
            child: Icon(icon, color: AppColors.primary),
          ),
          const SizedBox(width: 14),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
