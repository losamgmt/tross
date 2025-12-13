// Development Mode Notice - Shows development environment indicator
import 'package:flutter/material.dart';
import '../../config/app_config.dart';
import '../../config/constants.dart';

class DevelopmentModeNotice extends StatelessWidget {
  const DevelopmentModeNotice({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (!AppConfig.isDevelopment) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.secondaryContainer,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: theme.colorScheme.secondary, width: 2),
      ),
      child: Row(
        children: [
          Icon(
            Icons.developer_mode,
            color: theme.colorScheme.secondary,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  AppConstants.devModeTitle,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.secondary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  AppConstants.devModeDescription,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSecondaryContainer,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
