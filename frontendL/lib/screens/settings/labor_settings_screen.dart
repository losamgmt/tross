/// LaborSettingsScreen - Labor configuration with tabbed interface
///
/// Features:
/// - General Settings: Events, timezone, invoicing, timesheets
/// - Time Tracking: Automatic tracking, mobile, overtime allocation
/// - Labor Rate Groups & Types
/// - Labor Rate Modifiers
/// - Payroll Hour Rates & Types
/// - Billing Hour Rates & Types
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../../config/app_colors.dart';
import '../../widgets/organisms/organisms.dart';
import '../../widgets/molecules/cards/page_header.dart';

class LaborSettingsScreen extends StatefulWidget {
  const LaborSettingsScreen({super.key});

  @override
  State<LaborSettingsScreen> createState() => _LaborSettingsScreenState();
}

class _LaborSettingsScreenState extends State<LaborSettingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // General Settings state
  bool _billableEventsEnabled = true;
  bool _nonBillableEventsEnabled = true;
  String _timezone = 'America/Los_Angeles';
  String _weekStart = 'SUNDAY';
  bool _requireInvoiceDateForBilling = false;
  bool _requireInvoiceDateForPayroll = false;
  bool _showDeactivatedTimesheets = true;
  String _timesheetExport = 'Landing Page';

  // Time Tracking state
  String _roundTimeTracking = 'Nearest 15 minutes';
  bool _mobileTimesheetsViewOnly = false;
  bool _enableTravelHomeAction = false;
  bool _enableServiceCrewTimeTracking = false;
  bool _dailyAllocation = true;
  int _dailyThreshold = 8;
  bool _weeklyAllocation = true;
  int _weeklyThreshold = 40;
  String _overtimePayrollHourType = 'Overtime';
  bool _applyThresholdSeparately = true;

  final List<String> _timesheetExportOptions = [
    'Landing Page',
    'Invoice and Sales Dashboard',
    'Custom Export 1',
    'Custom Export 2',
    'QuickBooks Export',
    'ADP Export',
    'Paychex Export',
    'Gusto Export',
    'Excel Export',
    'CSV Export',
  ];

  final List<String> _roundingOptions = [
    'No Rounding',
    'Nearest 5 minutes',
    'Nearest 10 minutes',
    'Nearest 15 minutes',
    'Nearest 30 minutes',
    'Nearest hour',
  ];

  // Labor Rate Groups & Types data
  final List<Map<String, dynamic>> _laborRateGroups = [
    {
      'name': 'Standard Rates',
      'description': 'Default labor rates for all technicians',
      'isDefault': true,
      'employeeCount': 25,
      'baseRate': 75.0,
    },
    {
      'name': 'Senior Technician Rates',
      'description': 'Premium rates for senior staff',
      'isDefault': false,
      'employeeCount': 8,
      'baseRate': 95.0,
    },
    {
      'name': 'Emergency Rates',
      'description': 'After-hours and emergency service rates',
      'isDefault': false,
      'employeeCount': 15,
      'baseRate': 125.0,
    },
  ];

  // Labor Rate Modifiers data
  final List<Map<String, dynamic>> _laborModifiers = [
    {
      'name': 'Weekend Premium',
      'type': 'Percentage',
      'value': 25.0,
      'appliesTo': 'All Rates',
      'isActive': true,
    },
    {
      'name': 'Holiday Premium',
      'type': 'Percentage',
      'value': 50.0,
      'appliesTo': 'All Rates',
      'isActive': true,
    },
    {
      'name': 'Night Shift',
      'type': 'Fixed Amount',
      'value': 15.0,
      'appliesTo': 'Standard Rates',
      'isActive': true,
    },
    {
      'name': 'Hazard Pay',
      'type': 'Fixed Amount',
      'value': 20.0,
      'appliesTo': 'All Rates',
      'isActive': false,
    },
  ];

  // Payroll Hour Types data
  bool _mapPayrollToBilling = true;
  final List<String> _laborGroups = [
    'Build',
    'Engineering',
    'Lighting',
    'Porter',
    'Service',
  ];

  final List<Map<String, dynamic>> _payrollHourTypes = [
    {
      'name': 'Regular Time',
      'code': 'RT',
      'mapsTo': 'Regular',
    },
    {
      'name': 'Overtime',
      'code': 'OT',
      'mapsTo': 'Overtime',
    },
    {
      'name': 'Double Time',
      'code': 'DT',
      'mapsTo': 'Doubletime/Holiday',
    },
    {
      'name': 'Paid Break Out',
      'code': '',
      'mapsTo': 'Prevailing Wage',
    },
    {
      'name': 'Paid Holiday',
      'code': '',
      'mapsTo': 'Prevailing Wage',
    },
  ];

  // Billing Hour Types data
  String _defaultBillingProduct = 'Labor';
  final List<Map<String, dynamic>> _billingHourTypes = [
    {
      'name': 'Regular',
      'code': 'REG',
    },
    {
      'name': 'Overtime',
      'code': 'OT',
    },
    {
      'name': 'Doubletime/Holiday',
      'code': 'DT',
    },
    {
      'name': 'Prevailing Wage',
      'code': 'PW',
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return Scaffold(
      appBar: const AppHeader(pageTitle: 'Labor Settings'),
      body: Column(
        children: [
          // Page header
          Padding(
            padding: spacing.paddingLG,
            child: const PageHeader(
              title: 'Labor Settings',
              subtitle: 'Configure labor rates, time tracking, and payroll',
            ),
          ),

          // Tabs
          Container(
            color: AppColors.surfaceLight,
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor: AppColors.brandPrimary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.brandPrimary,
              tabs: const [
                Tab(text: 'General Settings'),
                Tab(text: 'Time Tracking'),
                Tab(text: 'Labor Rate Groups & Types'),
                Tab(text: 'Labor Rate Modifiers'),
                Tab(text: 'Payroll Hour Rates & Types'),
                Tab(text: 'Billing Hour Rates & Types'),
              ],
            ),
          ),

          // Tab content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildGeneralSettingsTab(),
                _buildTimeTrackingTab(),
                _buildLaborRateGroupsTab(),
                _buildLaborModifiersTab(),
                _buildPayrollHourTypesTab(),
                _buildBillingHourTypesTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGeneralSettingsTab() {
    final spacing = context.spacing;

    return SingleChildScrollView(
      padding: spacing.paddingLG,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Events Section
          _buildSectionHeader('Events'),
          _buildSettingRow(
            'Enable billable events',
            'Allow tracking of billable time events',
            _billableEventsEnabled,
            (value) => setState(() => _billableEventsEnabled = value),
          ),
          _buildSettingRow(
            'Enable non-billable events',
            'Allow tracking of non-billable time events',
            _nonBillableEventsEnabled,
            (value) => setState(() => _nonBillableEventsEnabled = value),
          ),
          SizedBox(height: spacing.xl),

          // Office Timezone Section
          _buildSectionHeader('Office Timezone'),
          _buildDropdownSetting(
            'Timezone',
            _timezone,
            ['America/Los_Angeles', 'America/New_York', 'America/Chicago', 'America/Denver'],
            (value) => setState(() => _timezone = value!),
          ),
          _buildDropdownSetting(
            'Week Starts On',
            _weekStart,
            ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
            (value) => setState(() => _weekStart = value!),
          ),
          SizedBox(height: spacing.xl),

          // Invoicing Behavior Section
          _buildSectionHeader('Invoicing Behavior'),
          _buildSettingRow(
            'Require invoice date for billing',
            'Require invoice date when creating billing entries',
            _requireInvoiceDateForBilling,
            (value) => setState(() => _requireInvoiceDateForBilling = value),
          ),
          _buildSettingRow(
            'Require invoice date for payroll',
            'Require invoice date when processing payroll',
            _requireInvoiceDateForPayroll,
            (value) => setState(() => _requireInvoiceDateForPayroll = value),
          ),
          SizedBox(height: spacing.xl),

          // Timesheets Section
          _buildSectionHeader('Timesheets'),
          _buildSettingRow(
            'Show deactivated employee timesheets',
            'Display timesheets for deactivated employees',
            _showDeactivatedTimesheets,
            (value) => setState(() => _showDeactivatedTimesheets = value),
          ),
          SizedBox(height: spacing.xl),

          // Timesheet Export Section
          _buildSectionHeader('Timesheet Export'),
          _buildDropdownSetting(
            'Default Export Format',
            _timesheetExport,
            _timesheetExportOptions,
            (value) => setState(() => _timesheetExport = value!),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeTrackingTab() {
    final spacing = context.spacing;

    return SingleChildScrollView(
      padding: spacing.paddingLG,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Automatic Time Tracking Section
          _buildSectionHeader('Automatic Time Tracking'),
          _buildDropdownSetting(
            'Round time tracking',
            _roundTimeTracking,
            _roundingOptions,
            (value) => setState(() => _roundTimeTracking = value!),
          ),
          SizedBox(height: spacing.xl),

          // Mobile Section
          _buildSectionHeader('Mobile'),
          _buildSettingRow(
            'Mobile timesheets view only',
            'Restrict mobile users to view-only access for timesheets',
            _mobileTimesheetsViewOnly,
            (value) => setState(() => _mobileTimesheetsViewOnly = value),
          ),
          _buildSettingRow(
            'Enable "Travel Home" action',
            'Allow employees to clock travel time to home',
            _enableTravelHomeAction,
            (value) => setState(() => _enableTravelHomeAction = value),
          ),
          _buildSettingRow(
            'Enable Service Crew time tracking',
            'Allow service crew members to track time',
            _enableServiceCrewTimeTracking,
            (value) => setState(() => _enableServiceCrewTimeTracking = value),
          ),
          SizedBox(height: spacing.xl),

          // Bulk Overtime Allocation Section
          _buildSectionHeader('Bulk Overtime Allocation'),
          _buildSettingRow(
            'Daily allocation',
            'Automatically allocate overtime on a daily basis',
            _dailyAllocation,
            (value) => setState(() => _dailyAllocation = value),
          ),
          if (_dailyAllocation) ...[
            Padding(
              padding: EdgeInsets.only(left: spacing.lg),
              child: _buildNumberSetting(
                'Daily threshold (hours)',
                _dailyThreshold,
                (value) => setState(() => _dailyThreshold = value),
              ),
            ),
          ],
          SizedBox(height: spacing.md),
          _buildSettingRow(
            'Weekly allocation',
            'Automatically allocate overtime on a weekly basis',
            _weeklyAllocation,
            (value) => setState(() => _weeklyAllocation = value),
          ),
          if (_weeklyAllocation) ...[
            Padding(
              padding: EdgeInsets.only(left: spacing.lg),
              child: _buildNumberSetting(
                'Weekly threshold (hours)',
                _weeklyThreshold,
                (value) => setState(() => _weeklyThreshold = value),
              ),
            ),
          ],
          SizedBox(height: spacing.md),
          _buildDropdownSetting(
            'Overtime payroll hour type',
            _overtimePayrollHourType,
            ['Overtime', 'Double Time', 'Time and a Half', 'Custom Rate'],
            (value) => setState(() => _overtimePayrollHourType = value!),
          ),
          _buildSettingRow(
            'Apply threshold separately per job',
            'Calculate overtime thresholds separately for each job',
            _applyThresholdSeparately,
            (value) => setState(() => _applyThresholdSeparately = value),
          ),
        ],
      ),
    );
  }

  Widget _buildLaborRateGroupsTab() {
    final spacing = context.spacing;

    return Column(
      children: [
        // Action bar
        Container(
          padding: spacing.paddingMD,
          decoration: BoxDecoration(
            color: AppColors.surfaceLight,
            border: Border(
              bottom: BorderSide(color: AppColors.border),
            ),
          ),
          child: Row(
            children: [
              ElevatedButton.icon(
                onPressed: () {
                  // TODO: Show create rate group dialog
                },
                icon: const Icon(Icons.add, size: 18),
                label: const Text('ADD RATE GROUP'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.brandPrimary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                '${_laborRateGroups.length} rate groups',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),

        // Rate groups list
        Expanded(
          child: SingleChildScrollView(
            padding: spacing.paddingLG,
            child: Column(
              children: _laborRateGroups.map((group) {
                return _buildLaborRateGroupCard(group);
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLaborRateGroupCard(Map<String, dynamic> group) {
    final spacing = context.spacing;

    return Card(
      margin: EdgeInsets.only(bottom: spacing.md),
      child: Padding(
        padding: spacing.paddingMD,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            group['name'],
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          if (group['isDefault']) ...[
                            SizedBox(width: spacing.sm),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.brandPrimary.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'DEFAULT',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.brandPrimary,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      SizedBox(height: spacing.xs),
                      Text(
                        group['description'],
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      SizedBox(height: spacing.xs),
                      Row(
                        children: [
                          Text(
                            '${group['employeeCount']} employees',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          SizedBox(width: spacing.md),
                          Text(
                            'Base Rate: \$${group['baseRate'].toStringAsFixed(2)}/hr',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: AppColors.success,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            SizedBox(height: spacing.md),
            Row(
              children: [
                TextButton.icon(
                  onPressed: () {
                    // TODO: Edit rate group
                  },
                  icon: const Icon(Icons.edit, size: 16),
                  label: const Text('Edit'),
                ),
                TextButton.icon(
                  onPressed: () {
                    // TODO: View employees
                  },
                  icon: const Icon(Icons.people, size: 16),
                  label: const Text('View Employees'),
                ),
                if (!group['isDefault'])
                  TextButton.icon(
                    onPressed: () {
                      // TODO: Set as default
                    },
                    icon: const Icon(Icons.check_circle, size: 16),
                    label: const Text('Set as Default'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLaborModifiersTab() {
    final spacing = context.spacing;

    return Column(
      children: [
        // Action bar
        Container(
          padding: spacing.paddingMD,
          decoration: BoxDecoration(
            color: AppColors.surfaceLight,
            border: Border(
              bottom: BorderSide(color: AppColors.border),
            ),
          ),
          child: Row(
            children: [
              ElevatedButton.icon(
                onPressed: () {
                  // TODO: Show create modifier dialog
                },
                icon: const Icon(Icons.add, size: 18),
                label: const Text('ADD MODIFIER'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.brandPrimary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                '${_laborModifiers.length} modifiers',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),

        // Modifiers list
        Expanded(
          child: SingleChildScrollView(
            padding: spacing.paddingLG,
            child: Column(
              children: _laborModifiers.map((modifier) {
                return _buildModifierCard(modifier);
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildModifierCard(Map<String, dynamic> modifier) {
    final spacing = context.spacing;

    return Card(
      margin: EdgeInsets.only(bottom: spacing.md),
      child: Padding(
        padding: spacing.paddingMD,
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    modifier['name'],
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: spacing.xs),
                  Text(
                    '${modifier['type']}: ${modifier['type'] == 'Percentage' ? '${modifier['value'].toStringAsFixed(0)}%' : '\$${modifier['value'].toStringAsFixed(2)}'}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.success,
                    ),
                  ),
                  SizedBox(height: spacing.xs),
                  Text(
                    'Applies to: ${modifier['appliesTo']}',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Switch(
                  value: modifier['isActive'],
                  onChanged: (value) {
                    setState(() {
                      modifier['isActive'] = value;
                    });
                  },
                  activeColor: AppColors.success,
                ),
                Text(
                  modifier['isActive'] ? 'Active' : 'Inactive',
                  style: TextStyle(
                    fontSize: 12,
                    color: modifier['isActive']
                        ? AppColors.success
                        : AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPayrollHourTypesTab() {
    final spacing = context.spacing;

    return SingleChildScrollView(
      padding: spacing.paddingLG,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Payroll Hour Rates Section
          Text(
            'Payroll Hour Rates',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.brandPrimary,
            ),
          ),
          SizedBox(height: spacing.md),

          // Rates table
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Column(
              children: [
                // Header row
                Container(
                  padding: spacing.paddingMD,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(4),
                      topRight: Radius.circular(4),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: Text(
                          'Group',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          'RT',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          'OT',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Data rows
                ..._laborGroups.map((group) {
                  return Container(
                    padding: spacing.paddingMD,
                    decoration: BoxDecoration(
                      border: Border(
                        top: BorderSide(color: AppColors.border),
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: Row(
                            children: [
                              Icon(
                                Icons.chevron_right,
                                size: 20,
                                color: AppColors.textSecondary,
                              ),
                              SizedBox(width: spacing.sm),
                              Text(
                                group,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Expanded(child: SizedBox()),
                        const Expanded(child: SizedBox()),
                      ],
                    ),
                  );
                }).toList(),
              ],
            ),
          ),

          SizedBox(height: spacing.xl),

          // Payroll Hour Types Section
          Text(
            'Payroll Hour Types',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.brandPrimary,
            ),
          ),
          SizedBox(height: spacing.md),

          // Map Payroll Hours to Billing Hours toggle
          Row(
            children: [
              Text(
                'Map Payroll Hours to Billing Hours',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
              ),
              SizedBox(width: spacing.md),
              Switch(
                value: _mapPayrollToBilling,
                onChanged: (value) {
                  setState(() => _mapPayrollToBilling = value);
                },
                activeColor: AppColors.success,
              ),
            ],
          ),

          SizedBox(height: spacing.sm),

          // Description text
          Text(
            'Enabling this feature will allow Payroll Hour Types to map to Billing Hour Types. Billing hours are automatically filled when Labor Line Items are generated on Job Reports.',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),

          SizedBox(height: spacing.md),

          // Payroll hour types mapping table
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Column(
              children: _payrollHourTypes.map((hourType) {
                return Container(
                  padding: spacing.paddingMD,
                  decoration: BoxDecoration(
                    border: Border(
                      top: _payrollHourTypes.indexOf(hourType) == 0
                          ? BorderSide.none
                          : BorderSide(color: AppColors.border),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.drag_indicator,
                        size: 20,
                        color: AppColors.textSecondary,
                      ),
                      SizedBox(width: spacing.md),
                      Expanded(
                        flex: 2,
                        child: Text(
                          hourType['name'],
                          style: TextStyle(
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          hourType['code'],
                          style: TextStyle(
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: DropdownButtonFormField<String>(
                          value: hourType['mapsTo'],
                          decoration: InputDecoration(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          items: [
                            'Regular',
                            'Overtime',
                            'Doubletime/Holiday',
                            'Prevailing Wage',
                          ].map((option) {
                            return DropdownMenuItem(
                              value: option,
                              child: Text(
                                option,
                                style: const TextStyle(fontSize: 14),
                              ),
                            );
                          }).toList(),
                          onChanged: (value) {
                            setState(() {
                              hourType['mapsTo'] = value;
                            });
                          },
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),

          SizedBox(height: spacing.md),

          // Add button
          TextButton.icon(
            onPressed: () {
              // TODO: Add payroll hour type
            },
            icon: const Icon(Icons.add, size: 18),
            label: const Text('PAYROLL HOUR TYPE'),
            style: TextButton.styleFrom(
              foregroundColor: AppColors.brandPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBillingHourTypesTab() {
    final spacing = context.spacing;

    return SingleChildScrollView(
      padding: spacing.paddingLG,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Billing Section
          Text(
            'Billing',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.brandPrimary,
            ),
          ),
          SizedBox(height: spacing.md),

          // Billing rates table
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Column(
              children: [
                // Header row
                Container(
                  padding: spacing.paddingMD,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(4),
                      topRight: Radius.circular(4),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: Text(
                          'Group',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          'REG',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          'OT',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          'DT',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Data rows
                ..._laborGroups.map((group) {
                  return Container(
                    padding: spacing.paddingMD,
                    decoration: BoxDecoration(
                      border: Border(
                        top: BorderSide(color: AppColors.border),
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: Row(
                            children: [
                              Icon(
                                Icons.chevron_right,
                                size: 20,
                                color: AppColors.textSecondary,
                              ),
                              SizedBox(width: spacing.sm),
                              Text(
                                group,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Expanded(child: SizedBox()),
                        const Expanded(child: SizedBox()),
                        const Expanded(child: SizedBox()),
                      ],
                    ),
                  );
                }).toList(),
              ],
            ),
          ),

          SizedBox(height: spacing.xl),

          // Billing Hour Types Section
          Text(
            'Billing Hour Types',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.brandPrimary,
            ),
          ),
          SizedBox(height: spacing.sm),

          // Description text
          Text(
            'DEFAULT BILLING PRODUCT FOR LABOR INVOICE ITEMS',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
              letterSpacing: 0.5,
            ),
          ),

          SizedBox(height: spacing.sm),

          // Default billing product search field
          TextFormField(
            initialValue: _defaultBillingProduct,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search, size: 20),
              hintText: 'Search...',
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 8,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            onChanged: (value) {
              setState(() => _defaultBillingProduct = value);
            },
          ),

          SizedBox(height: spacing.sm),

          // Description text
          Text(
            'The new default will only be applied to new Billing Hour Types created',
            style: TextStyle(
              fontSize: 11,
              color: AppColors.textSecondary,
            ),
          ),

          SizedBox(height: spacing.md),

          // Billing hour types list
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Column(
              children: _billingHourTypes.map((billingType) {
                return Container(
                  padding: spacing.paddingMD,
                  decoration: BoxDecoration(
                    border: Border(
                      top: _billingHourTypes.indexOf(billingType) == 0
                          ? BorderSide.none
                          : BorderSide(color: AppColors.border),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.drag_indicator,
                        size: 20,
                        color: AppColors.textSecondary,
                      ),
                      SizedBox(width: spacing.md),
                      Expanded(
                        flex: 2,
                        child: Text(
                          billingType['name'],
                          style: TextStyle(
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          billingType['code'],
                          style: TextStyle(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),

          SizedBox(height: spacing.md),

          // Add button
          TextButton.icon(
            onPressed: () {
              // TODO: Add billing hour type
            },
            icon: const Icon(Icons.add, size: 18),
            label: const Text('BILLING HOUR TYPE'),
            style: TextButton.styleFrom(
              foregroundColor: AppColors.brandPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlaceholderTab(String title) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.construction, size: 64, color: AppColors.textSecondary),
          const SizedBox(height: 16),
          Text(
            '$title Coming Soon',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
      ),
    );
  }

  Widget _buildSettingRow(
    String title,
    String description,
    bool value,
    ValueChanged<bool> onChanged,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: AppColors.brandPrimary,
          ),
        ],
      ),
    );
  }

  Widget _buildDropdownSetting(
    String label,
    String value,
    List<String> options,
    ValueChanged<String?> onChanged,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: DropdownButtonFormField<String>(
              value: value,
              decoration: InputDecoration(
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              items: options.map((option) {
                return DropdownMenuItem(
                  value: option,
                  child: Text(option, style: const TextStyle(fontSize: 14)),
                );
              }).toList(),
              onChanged: onChanged,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNumberSetting(
    String label,
    int value,
    ValueChanged<int> onChanged,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: TextFormField(
              initialValue: value.toString(),
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              onChanged: (newValue) {
                final parsed = int.tryParse(newValue);
                if (parsed != null) {
                  onChanged(parsed);
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}
