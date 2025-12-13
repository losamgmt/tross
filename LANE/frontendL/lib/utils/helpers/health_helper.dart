/// HealthHelper - Health status utility functions
///
/// Uses centralized AppColors constants - ZERO duplication
/// NO business logic - pure status-to-UI mapping only
/// SRP: Health status visualization logic ONLY
library;

import 'package:flutter/material.dart';
import '../../config/app_colors.dart';

/// Health status utilities
class HealthHelper {
  HealthHelper._(); // Private constructor - static class only

  /// Maps health status string to color
  ///
  /// Uses centralized AppColors constants
  /// Case-insensitive matching
  /// Returns textSecondary for unknown statuses
  ///
  /// Examples:
  ///   getColorForStatus('healthy') => AppColors.success
  ///   getColorForStatus('DEGRADED') => AppColors.warning
  ///   getColorForStatus('critical') => AppColors.error
  ///   getColorForStatus('unknown') => AppColors.textSecondary
  static Color getColorForStatus(String? status) {
    if (status == null || status.isEmpty) return AppColors.textSecondary;

    switch (status.toLowerCase()) {
      case 'healthy':
      case 'success':
      case 'ok':
      case 'good':
        return AppColors.success;
      case 'degraded':
      case 'warning':
      case 'caution':
        return AppColors.warning;
      case 'critical':
      case 'error':
      case 'failed':
      case 'bad':
        return AppColors.error;
      default:
        return AppColors.textSecondary;
    }
  }

  /// Maps health status string to icon
  ///
  /// Case-insensitive matching
  /// Returns help_outline for unknown statuses
  ///
  /// Examples:
  ///   getIconForStatus('healthy') => Icons.check_circle
  ///   getIconForStatus('DEGRADED') => Icons.warning
  ///   getIconForStatus('critical') => Icons.error
  ///   getIconForStatus('unknown') => Icons.help_outline
  static IconData getIconForStatus(String? status) {
    if (status == null || status.isEmpty) return Icons.help_outline;

    switch (status.toLowerCase()) {
      case 'healthy':
      case 'success':
      case 'ok':
      case 'good':
        return Icons.check_circle;
      case 'degraded':
      case 'warning':
      case 'caution':
        return Icons.warning;
      case 'critical':
      case 'error':
      case 'failed':
      case 'bad':
        return Icons.error;
      default:
        return Icons.help_outline;
    }
  }
}
