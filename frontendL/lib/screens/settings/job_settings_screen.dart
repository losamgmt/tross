import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_spacing.dart';
import '../../widgets/organisms/app_header.dart';

/// Job Settings Screen
/// Configures job-level settings and job report display options
class JobSettingsScreen extends StatefulWidget {
  const JobSettingsScreen({super.key});

  @override
  State<JobSettingsScreen> createState() => _JobSettingsScreenState();
}

class _JobSettingsScreenState extends State<JobSettingsScreen> {
  // Job Report Settings
  bool _hideInvoicedItems = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppHeader(
        pageTitle: 'Job Settings',
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: EdgeInsets.all(context.spacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Page Header
              Row(
                children: [
                  Icon(
                    Icons.settings_rounded,
                    size: 32,
                    color: AppColors.textPrimary,
                  ),
                  SizedBox(width: context.spacing.md),
                  Text(
                    'Job Settings',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              SizedBox(height: context.spacing.lg),

              // Job Report Section
              _buildJobReportSection(),
            ],
          ),
        ),
      ),
    );
  }

  /// Build Job Report Section
  Widget _buildJobReportSection() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(
          color: AppColors.border,
          width: 1,
        ),
      ),
      child: Padding(
        padding: EdgeInsets.all(context.spacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Section Header
            Text(
              'Job Report',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            SizedBox(height: context.spacing.lg),

            // Hide Invoiced Items Setting
            _buildSettingRow(
              label: 'Hide Invoiced Items',
              value: _hideInvoicedItems,
              onChanged: (value) {
                setState(() {
                  _hideInvoicedItems = value;
                });
              },
              description:
                  'Defines whether invoiced Labor, Inventory, and Purchased items should be hidden by default on the Job Report page.',
            ),
          ],
        ),
      ),
    );
  }

  /// Build Setting Row with Toggle
  Widget _buildSettingRow({
    required String label,
    required bool value,
    required ValueChanged<bool> onChanged,
    required String description,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Left Column: Setting and Toggle
        Expanded(
          flex: 2,
          child: Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              SizedBox(width: context.spacing.md),
              Switch(
                value: value,
                onChanged: onChanged,
                activeColor: AppColors.success,
              ),
            ],
          ),
        ),
        SizedBox(width: context.spacing.xl),

        // Right Column: Description
        Expanded(
          flex: 3,
          child: Text(
            description,
            style: TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
              height: 1.5,
            ),
          ),
        ),
      ],
    );
  }
}
