import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_spacing.dart';
import '../../widgets/organisms/app_header.dart';

/// Invoice Settings Screen
/// Configures invoice summary generation and visit summary inclusion
class InvoiceSettingsScreen extends StatefulWidget {
  const InvoiceSettingsScreen({super.key});

  @override
  State<InvoiceSettingsScreen> createState() => _InvoiceSettingsScreenState();
}

class _InvoiceSettingsScreenState extends State<InvoiceSettingsScreen> {
  // Visit Summary
  String _visitSummaryOption = 'all';

  // Invoice Summary Generation
  String _invoiceSummaryGeneration = 'write';

  // Include Assets Worked On
  bool _includeAssets = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppHeader(
        pageTitle: 'Invoice Settings',
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Page Header with SAVE button
            Container(
              padding: EdgeInsets.all(context.spacing.lg),
              decoration: BoxDecoration(
                color: AppColors.white,
                border: Border(
                  bottom: BorderSide(
                    color: AppColors.border,
                    width: 1,
                  ),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.settings_rounded,
                    size: 28,
                    color: AppColors.success,
                  ),
                  SizedBox(width: context.spacing.md),
                  Text(
                    'Invoice Settings',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success,
                      foregroundColor: AppColors.white,
                      padding: EdgeInsets.symmetric(
                        horizontal: context.spacing.xl,
                        vertical: context.spacing.md,
                      ),
                    ),
                    child: const Text('SAVE'),
                  ),
                ],
              ),
            ),

            // Content
            Padding(
              padding: EdgeInsets.all(context.spacing.xl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Visit Summary Section
                  _buildVisitSummarySection(),
                  SizedBox(height: context.spacing.xxl),

                  // Invoice Summary Generation Section
                  _buildInvoiceSummaryGenerationSection(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build Visit Summary Section
  Widget _buildVisitSummarySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Visit Summary',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        SizedBox(height: context.spacing.sm),
        Text(
          'Select which visit summaries are used when including visit summaries in the invoice summary or generating an invoice summary using BuildOps AI.',
          style: TextStyle(
            fontSize: 14,
            color: AppColors.textSecondary,
            height: 1.5,
          ),
        ),
        SizedBox(height: context.spacing.lg),

        // Radio Options
        RadioListTile<String>(
          value: 'costs',
          groupValue: _visitSummaryOption,
          onChanged: (value) {
            setState(() {
              _visitSummaryOption = value!;
            });
          },
          title: Text(
            'Only include visit summaries for visits with costs on the invoice',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textPrimary,
            ),
          ),
          activeColor: AppColors.success,
          contentPadding: EdgeInsets.zero,
        ),
        RadioListTile<String>(
          value: 'all',
          groupValue: _visitSummaryOption,
          onChanged: (value) {
            setState(() {
              _visitSummaryOption = value!;
            });
          },
          title: Text(
            'Include all visit summaries when generating an invoice',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textPrimary,
            ),
          ),
          activeColor: AppColors.success,
          contentPadding: EdgeInsets.zero,
        ),
      ],
    );
  }

  /// Build Invoice Summary Generation Section
  Widget _buildInvoiceSummaryGenerationSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Invoice Summary Generation',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        SizedBox(height: context.spacing.sm),
        Text(
          'Select how invoice summaries are generated by default. This can be changed for any invoice.',
          style: TextStyle(
            fontSize: 14,
            color: AppColors.textSecondary,
            height: 1.5,
          ),
        ),
        SizedBox(height: context.spacing.lg),

        // Radio Options
        RadioListTile<String>(
          value: 'empty',
          groupValue: _invoiceSummaryGeneration,
          onChanged: (value) {
            setState(() {
              _invoiceSummaryGeneration = value!;
            });
          },
          title: Text(
            'Leave empty',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textPrimary,
            ),
          ),
          activeColor: AppColors.success,
          contentPadding: EdgeInsets.zero,
        ),
        RadioListTile<String>(
          value: 'include',
          groupValue: _invoiceSummaryGeneration,
          onChanged: (value) {
            setState(() {
              _invoiceSummaryGeneration = value!;
            });
          },
          title: Text(
            'Include visit summaries in the invoice summary',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textPrimary,
            ),
          ),
          activeColor: AppColors.success,
          contentPadding: EdgeInsets.zero,
        ),
        RadioListTile<String>(
          value: 'write',
          groupValue: _invoiceSummaryGeneration,
          onChanged: (value) {
            setState(() {
              _invoiceSummaryGeneration = value!;
            });
          },
          title: Row(
            children: [
              Text(
                'Write my invoice summary',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textPrimary,
                ),
              ),
              SizedBox(width: context.spacing.md),
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: context.spacing.sm,
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: AppColors.brandPrimary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(
                    color: AppColors.brandPrimary.withOpacity(0.3),
                    width: 1,
                  ),
                ),
                child: Text(
                  'BuildOps AI',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.brandPrimary,
                  ),
                ),
              ),
            ],
          ),
          activeColor: AppColors.success,
          contentPadding: EdgeInsets.zero,
        ),
        SizedBox(height: context.spacing.lg),

        // Include Assets Toggle
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Include Assets Worked On in invoice summary',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: context.spacing.xs),
                  Text(
                    'When enabled, the invoice summary will list all assets serviced during the visit in the invoice summary.',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(width: context.spacing.lg),
            Switch(
              value: _includeAssets,
              onChanged: (value) {
                setState(() {
                  _includeAssets = value;
                });
              },
              activeColor: AppColors.success,
            ),
          ],
        ),
      ],
    );
  }
}
