/// ServiceAgreementSettingsScreen - Service agreement and maintenance contract configuration
///
/// Features:
/// - Preferred technician selection settings
/// - Auto visit creation configuration
/// - Bulk visit creation for scheduled maintenance
/// - Service agreement field auto-population
/// - Recurring maintenance billing setup
/// - Task automation settings
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../config/app_spacing.dart';
import '../../config/app_colors.dart';
import '../../widgets/organisms/organisms.dart';

class ServiceAgreementSettingsScreen extends StatefulWidget {
  const ServiceAgreementSettingsScreen({super.key});

  @override
  State<ServiceAgreementSettingsScreen> createState() =>
      _ServiceAgreementSettingsScreenState();
}

class _ServiceAgreementSettingsScreenState
    extends State<ServiceAgreementSettingsScreen> {
  // All Visit Creation
  bool _preferredTechnicianSelection = true;

  // Auto Visit Creation
  bool _enableAutoVisitCreation = false;
  String _autoVisitOption = 'assign'; // 'none' or 'assign'

  // Bulk Visit Creation
  bool _bulkVisitCreation = true;

  // New Job
  bool _autoPopulateServiceAgreement = false;

  // Recurring Maintenance Billing
  final List<Map<String, String>> _invoiceLineItems = [
    {
      'item': 'Maintenance',
      'description': 'Contract Services',
      'percentage': '100',
    },
  ];

  // Tasks
  bool _autoUpdateOccurrences = true;

  int get _totalPercentage {
    return _invoiceLineItems.fold(
      0,
      (sum, item) => sum + (int.tryParse(item['percentage'] ?? '0') ?? 0),
    );
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return Scaffold(
      appBar: const AppHeader(pageTitle: 'Service Agreement Settings'),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Page header with SAVE button
            Padding(
              padding: spacing.paddingLG,
              child: Row(
                children: [
                  Icon(Icons.handshake, color: AppColors.success, size: 28),
                  SizedBox(width: spacing.md),
                  Text(
                    'Service Agreement Settings',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  ElevatedButton(
                    onPressed: () {
                      // TODO: Save settings
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 12,
                      ),
                    ),
                    child: const Text('SAVE'),
                  ),
                ],
              ),
            ),

            SizedBox(height: spacing.xl),

            // All Visit Creation Section
            Padding(
              padding: spacing.paddingLG,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'All Visit Creation',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.success,
                    ),
                  ),
                  SizedBox(height: spacing.md),
                  _buildToggleSetting(
                    'Preferred Technician Selection at Maintenance Template Level',
                    'By default, preferred technicians are determined at the agreement level and applied to all maintenance templates. Enabling this feature will allow setting preferred technicians at the maintenance template level for auto, bulk, and manual visit creation.',
                    _preferredTechnicianSelection,
                    (value) =>
                        setState(() => _preferredTechnicianSelection = value),
                  ),
                ],
              ),
            ),

            SizedBox(height: spacing.xxl),

            // Auto Visit Creation Section
            Padding(
              padding: spacing.paddingLG,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Auto Visit Creation',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.success,
                    ),
                  ),
                  SizedBox(height: spacing.md),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Enable Auto Visit Creation',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            SizedBox(height: spacing.md),
                            RadioListTile<String>(
                              title: const Text('Do Not Assign a Date'),
                              value: 'none',
                              groupValue: _autoVisitOption,
                              onChanged: _enableAutoVisitCreation
                                  ? (value) {
                                      setState(() => _autoVisitOption = value!);
                                    }
                                  : null,
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                            RadioListTile<String>(
                              title: const Text('Assign Maintenance Due Date'),
                              value: 'assign',
                              groupValue: _autoVisitOption,
                              onChanged: _enableAutoVisitCreation
                                  ? (value) {
                                      setState(() => _autoVisitOption = value!);
                                    }
                                  : null,
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                          ],
                        ),
                      ),
                      SizedBox(width: spacing.xl),
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Switch(
                              value: _enableAutoVisitCreation,
                              onChanged: (value) {
                                setState(() => _enableAutoVisitCreation = value);
                              },
                              activeColor: AppColors.success,
                            ),
                            SizedBox(height: spacing.md),
                            Text(
                              'Auto-create maintenance visits without assigning a date or create them with a date that is based on the maintenance due dates.',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            SizedBox(height: spacing.sm),
                            Text(
                              'Example: If budgeted hours per visit equals 3, earliest start date is Jan 1st, 2020, and due date is Dec 20, 2020, two 3 hour visits will be generated. One on Dec 20th and one on Dec 19th.',
                              style: TextStyle(
                                fontSize: 11,
                                color: AppColors.textSecondary,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            SizedBox(height: spacing.xxl),

            // Bulk Visit Creation Section
            Padding(
              padding: spacing.paddingLG,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Bulk Visit Creation',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.success,
                    ),
                  ),
                  SizedBox(height: spacing.md),
                  _buildToggleSetting(
                    'Bulk Visit Creation for Scheduled Maintenances',
                    'Enabling this feature will allow users to add visits for scheduled maintenances.',
                    _bulkVisitCreation,
                    (value) => setState(() => _bulkVisitCreation = value),
                  ),
                ],
              ),
            ),

            SizedBox(height: spacing.xxl),

            // New Job Section
            Padding(
              padding: spacing.paddingLG,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'New Job',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.success,
                    ),
                  ),
                  SizedBox(height: spacing.md),
                  _buildToggleSetting(
                    'Auto-populate service agreement field for new jobs',
                    'When this setting is enabled, any time when a Job is created for a Property that has a single active Service Agreement associated with it, the Service Agreement field is automatically populated for the Job along with all the benefits (e.g. pricing) associated with it (if one exists). When the setting is off, Service Agreement field is not automatically populated.',
                    _autoPopulateServiceAgreement,
                    (value) =>
                        setState(() => _autoPopulateServiceAgreement = value),
                  ),
                ],
              ),
            ),

            SizedBox(height: spacing.xxl),

            // Recurring Maintenance Billing Section
            Padding(
              padding: spacing.paddingLG,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Recurring Maintenance Billing',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.success,
                    ),
                  ),
                  SizedBox(height: spacing.md),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 3,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Invoice line items
                            ..._invoiceLineItems.asMap().entries.map((entry) {
                              final index = entry.key;
                              final item = entry.value;
                              return Padding(
                                padding: EdgeInsets.only(bottom: spacing.md),
                                child: Row(
                                  children: [
                                    Expanded(
                                      flex: 2,
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'INVOICE LINE ITEM',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w500,
                                              color: AppColors.textSecondary,
                                            ),
                                          ),
                                          SizedBox(height: spacing.xs),
                                          TextFormField(
                                            initialValue: item['item'],
                                            decoration: InputDecoration(
                                              contentPadding:
                                                  const EdgeInsets.symmetric(
                                                horizontal: 12,
                                                vertical: 10,
                                              ),
                                              border: OutlineInputBorder(
                                                borderRadius:
                                                    BorderRadius.circular(4),
                                              ),
                                              suffixIcon: IconButton(
                                                icon: const Icon(Icons.close,
                                                    size: 18),
                                                onPressed: () {
                                                  setState(() {
                                                    _invoiceLineItems
                                                        .removeAt(index);
                                                  });
                                                },
                                              ),
                                            ),
                                            onChanged: (value) {
                                              setState(() {
                                                _invoiceLineItems[index]
                                                    ['item'] = value;
                                              });
                                            },
                                          ),
                                        ],
                                      ),
                                    ),
                                    SizedBox(width: spacing.md),
                                    Expanded(
                                      flex: 2,
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'LINE ITEM DESCRIPTION',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w500,
                                              color: AppColors.textSecondary,
                                            ),
                                          ),
                                          SizedBox(height: spacing.xs),
                                          TextFormField(
                                            initialValue: item['description'],
                                            decoration: InputDecoration(
                                              contentPadding:
                                                  const EdgeInsets.symmetric(
                                                horizontal: 12,
                                                vertical: 10,
                                              ),
                                              border: OutlineInputBorder(
                                                borderRadius:
                                                    BorderRadius.circular(4),
                                              ),
                                            ),
                                            onChanged: (value) {
                                              setState(() {
                                                _invoiceLineItems[index]
                                                    ['description'] = value;
                                              });
                                            },
                                          ),
                                        ],
                                      ),
                                    ),
                                    SizedBox(width: spacing.md),
                                    SizedBox(
                                      width: 120,
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'PERCENTAGE OF TERM PRICE',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w500,
                                              color: AppColors.textSecondary,
                                            ),
                                          ),
                                          SizedBox(height: spacing.xs),
                                          Row(
                                            children: [
                                              Expanded(
                                                child: TextFormField(
                                                  initialValue:
                                                      item['percentage'],
                                                  keyboardType:
                                                      TextInputType.number,
                                                  inputFormatters: [
                                                    FilteringTextInputFormatter
                                                        .digitsOnly,
                                                  ],
                                                  decoration: InputDecoration(
                                                    contentPadding:
                                                        const EdgeInsets
                                                            .symmetric(
                                                      horizontal: 12,
                                                      vertical: 10,
                                                    ),
                                                    border: OutlineInputBorder(
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                              4),
                                                    ),
                                                  ),
                                                  onChanged: (value) {
                                                    setState(() {
                                                      _invoiceLineItems[index]
                                                          ['percentage'] = value;
                                                    });
                                                  },
                                                ),
                                              ),
                                              SizedBox(width: spacing.xs),
                                              Icon(
                                                Icons.close,
                                                size: 16,
                                                color: AppColors.textSecondary,
                                              ),
                                              SizedBox(width: spacing.xs),
                                              Text(
                                                '%',
                                                style: TextStyle(
                                                  fontSize: 14,
                                                  color: AppColors.textSecondary,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),

                            // Total percentage
                            Padding(
                              padding: EdgeInsets.symmetric(vertical: spacing.md),
                              child: Row(
                                children: [
                                  Text(
                                    'Total Percentage Allocated:',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  SizedBox(width: spacing.sm),
                                  Text(
                                    '$_totalPercentage %',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: _totalPercentage == 100
                                          ? AppColors.success
                                          : AppColors.error,
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Add invoice line item button
                            OutlinedButton.icon(
                              onPressed: () {
                                setState(() {
                                  _invoiceLineItems.add({
                                    'item': '',
                                    'description': '',
                                    'percentage': '0',
                                  });
                                });
                              },
                              icon: const Icon(Icons.add_circle_outline, size: 16),
                              label: const Text('ADD INVOICE LINE ITEM'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(width: spacing.xl),
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Determine how a service agreement\'s term price will be divided into line items on an Invoice. Add and setup each invoice line item name, description, and percentage of term price towards each line item.',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            SizedBox(height: spacing.md),
                            Text(
                              'Note: Total Percentage Allocated must be 100%.',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            SizedBox(height: spacing.xxl),

            // Tasks Section
            Padding(
              padding: spacing.paddingLG,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tasks',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.success,
                    ),
                  ),
                  SizedBox(height: spacing.md),
                  _buildToggleSetting(
                    'Automatically update total occurrences',
                    'Update the total occurrences to the maximum possible remaining occurrences, when the interval or first due date is changed on a task.',
                    _autoUpdateOccurrences,
                    (value) => setState(() => _autoUpdateOccurrences = value),
                  ),
                ],
              ),
            ),

            SizedBox(height: spacing.xxl),
          ],
        ),
      ),
    );
  }

  Widget _buildToggleSetting(
    String title,
    String description,
    bool value,
    ValueChanged<bool> onChanged,
  ) {
    final spacing = context.spacing;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 2,
          child: Text(
            title,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        SizedBox(width: spacing.xl),
        Icon(
          value ? Icons.check_circle : Icons.circle_outlined,
          color: value ? AppColors.success : AppColors.textSecondary,
          size: 24,
        ),
        SizedBox(width: spacing.xl),
        Expanded(
          flex: 2,
          child: Text(
            description,
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
        ),
      ],
    );
  }
}
