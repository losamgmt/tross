import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../config/app_colors.dart';
import '../../config/app_spacing.dart';
import '../../widgets/organisms/app_header.dart';

/// Accounting Settings Screen
/// Manages credit hold settings, GL accounts, classes, sales tax, and other accounting configurations
class AccountingSettingsScreen extends StatefulWidget {
  const AccountingSettingsScreen({super.key});

  @override
  State<AccountingSettingsScreen> createState() =>
      _AccountingSettingsScreenState();
}

class _AccountingSettingsScreenState extends State<AccountingSettingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Credit Hold Settings
  String _creditWarningOption = 'percentage';
  String _creditLimitPercentage = '80';
  bool _triggerCreditLimitExceeded = true;
  bool _triggerMinimumOverdue = false;
  String _minimumOverdueAmount = '';
  String _gracePeriodDays = '0';
  bool _createQuotes = false;
  bool _createJobs = false;
  bool _createMaintenance = true;
  bool _createProjects = false;

  // GL Accounts data
  final List<Map<String, String>> _glAccounts = [
    {'number': '6600', 'description': 'Auto/Travel', 'type': 'Expense', 'default': ''},
    {'number': '6088', 'description': 'Windows', 'type': 'Expense', 'default': ''},
    {'number': '6612', 'description': 'Parking Tickets', 'type': 'Expense', 'default': ''},
    {'number': '6561', 'description': 'QuickBooks Payments Fees', 'type': 'Expense', 'default': ''},
    {'number': '6060', 'description': 'Fire/Life Safety', 'type': 'Expense', 'default': ''},
    {'number': '6052', 'description': 'Security Patrol', 'type': 'Expense', 'default': ''},
    {'number': '4990', 'description': 'Discounts given', 'type': 'Income', 'default': ''},
    {'number': '6920', 'description': 'Employer Liability (EPLI)', 'type': 'Expense', 'default': ''},
    {'number': '6238', 'description': 'Conga', 'type': 'Expense', 'default': ''},
    {'number': '1060', 'description': 'Tross OE', 'type': 'Bank', 'default': ''},
    {'number': '4910', 'description': 'Condo Transfer Fee', 'type': 'Income', 'default': ''},
    {'number': '6940', 'description': 'Umbrella', 'type': 'Expense', 'default': ''},
    {'number': '6670', 'description': 'Water Transportation', 'type': 'Expense', 'default': ''},
    {'number': '6470', 'description': 'Donations/Contributions', 'type': 'Expense', 'default': ''},
    {'number': '6725', 'description': 'Service Expense', 'type': 'Expense', 'default': ''},
    {'number': '6700', 'description': 'Operating Expense', 'type': 'Expense', 'default': ''},
    {'number': '5215', 'description': 'Job Advertising', 'type': 'Expense', 'default': ''},
    {'number': '6251', 'description': 'Vantaca', 'type': 'Expense', 'default': ''},
    {'number': '-', 'description': 'Retained Earnings', 'type': 'Equity', 'default': ''},
    {'number': '1080', 'description': 'MSI', 'type': 'Bank', 'default': ''},
    {'number': '6410', 'description': 'Advertising', 'type': 'Expense', 'default': ''},
    {'number': '1420', 'description': 'Uncategorized Asset', 'type': 'OtherCurrentAsset', 'default': ''},
    {'number': '4160', 'description': 'Management Staff', 'type': 'Income', 'default': ''},
    {'number': '1081', 'description': 'Onpoint Checking', 'type': 'Bank', 'default': ''},
    {'number': '5320', 'description': 'IREM', 'type': 'Expense', 'default': ''},
  ];

  // Classes data
  final List<Map<String, String>> _classes = [
    {'name': 'Maintenance Porter', 'application': 'quickbooks'},
    {'name': 'Build', 'application': 'quickbooks'},
    {'name': 'Holiday Lighting', 'application': 'quickbooks'},
    {'name': 'Admin', 'application': 'quickbooks'},
    {'name': 'Operating Engineer', 'application': 'quickbooks'},
    {'name': 'Interior Porter', 'application': 'quickbooks'},
    {'name': 'Service', 'application': 'quickbooks'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 9, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppHeader(
        pageTitle: 'Accounting Settings',
      ),
      body: Column(
        children: [
          // Tabs Header
          Container(
            decoration: BoxDecoration(
              color: AppColors.white,
              border: Border(
                bottom: BorderSide(
                  color: AppColors.border,
                  width: 1,
                ),
              ),
            ),
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor: AppColors.success,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.success,
              indicatorWeight: 3,
              tabs: const [
                Tab(text: 'Credit Hold Settings'),
                Tab(text: 'GL Accounts'),
                Tab(text: 'Classes'),
                Tab(text: 'Sales Tax'),
                Tab(text: 'Payment Type'),
                Tab(text: 'Adjustment Types'),
                Tab(text: 'Payment Terms'),
                Tab(text: 'Sync Log History'),
                Tab(text: 'Accounting Calendar'),
              ],
            ),
          ),

          // Tab Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildCreditHoldSettingsTab(),
                _buildGLAccountsTab(),
                _buildClassesTab(),
                _buildSalesTaxTab(),
                _buildPlaceholderTab('Payment Type'),
                _buildPlaceholderTab('Adjustment Types'),
                _buildPlaceholderTab('Payment Terms'),
                _buildPlaceholderTab('Sync Log History'),
                _buildPlaceholderTab('Accounting Calendar'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Build Credit Hold Settings Tab
  Widget _buildCreditHoldSettingsTab() {
    return SingleChildScrollView(
      child: Column(
        children: [
          // SAVE button
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
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
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
              children: [
                // Credit Warning Section
                _buildCreditWarningSection(),
                SizedBox(height: context.spacing.xxl),

                // Credit Risk Section
                _buildCreditRiskSection(),
                SizedBox(height: context.spacing.xxl),

                // Credit Hold Section
                _buildCreditHoldSection(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Build Credit Warning Section
  Widget _buildCreditWarningSection() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: EdgeInsets.all(context.spacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning, color: Colors.amber[700], size: 20),
                SizedBox(width: context.spacing.sm),
                Text(
                  'Credit Warning',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            SizedBox(height: context.spacing.lg),

            // Option 1: Percentage
            RadioListTile<String>(
              value: 'percentage',
              groupValue: _creditWarningOption,
              onChanged: (value) {
                setState(() {
                  _creditWarningOption = value!;
                });
              },
              title: Text(
                'Trigger when a customer exceeds a percentage of their credit limit',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: context.spacing.sm),
                  Text(
                    'Change a customer\'s status to credit warning when they exceed a specified percentage of their credit limit.',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  SizedBox(height: context.spacing.md),
                  Text(
                    'CREDIT LIMIT PERCENTAGE',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  SizedBox(height: context.spacing.sm),
                  SizedBox(
                    width: 100,
                    child: TextFormField(
                      initialValue: _creditLimitPercentage,
                      enabled: _creditWarningOption == 'percentage',
                      decoration: InputDecoration(
                        suffixText: '%',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(4),
                        ),
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: context.spacing.md,
                          vertical: context.spacing.sm,
                        ),
                      ),
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    ),
                  ),
                ],
              ),
              activeColor: AppColors.success,
              contentPadding: EdgeInsets.zero,
            ),
            SizedBox(height: context.spacing.md),

            // Option 2: Minimum amount
            RadioListTile<String>(
              value: 'minimum',
              groupValue: _creditWarningOption,
              onChanged: (value) {
                setState(() {
                  _creditWarningOption = value!;
                });
              },
              title: Text(
                'Trigger when a customer exceeds a minimum credit amount',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: context.spacing.sm),
                  Text(
                    'Change a customer\'s status to credit warning when they exceed a specified minimum credit amount.',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  SizedBox(height: context.spacing.xs),
                  Text(
                    'Note: The minimum credit amount will apply to all customers.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ),
              activeColor: AppColors.success,
              contentPadding: EdgeInsets.zero,
            ),
          ],
        ),
      ),
    );
  }

  /// Build Credit Risk Section
  Widget _buildCreditRiskSection() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: EdgeInsets.all(context.spacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.error, color: Colors.orange[700], size: 20),
                SizedBox(width: context.spacing.sm),
                Text(
                  'Credit Risk',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            SizedBox(height: context.spacing.lg),

            // Credit Limit Checkbox
            CheckboxListTile(
              value: _triggerCreditLimitExceeded,
              onChanged: (value) {
                setState(() {
                  _triggerCreditLimitExceeded = value ?? false;
                });
              },
              title: Text(
                'Trigger when a customer exceeds their credit limit',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
              ),
              subtitle: Text(
                'Change a customer\'s status to credit risk once they exceed their specified credit limit.',
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
              activeColor: AppColors.success,
              contentPadding: EdgeInsets.zero,
            ),
            SizedBox(height: context.spacing.md),

            // Minimum Overdue Balance Checkbox
            CheckboxListTile(
              value: _triggerMinimumOverdue,
              onChanged: (value) {
                setState(() {
                  _triggerMinimumOverdue = value ?? false;
                });
              },
              title: Text(
                'Trigger when a customer exceeds a minimum overdue balance',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: context.spacing.sm),
                  Text(
                    'Change a customer\'s status to credit risk when they have an overdue balance after a specified grace period.',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  SizedBox(height: context.spacing.xs),
                  Text(
                    'Note: The minimum overdue balance will apply to all customers.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                  if (_triggerMinimumOverdue) ...[
                    SizedBox(height: context.spacing.md),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'MINIMUM OVERDUE AMOUNT',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              SizedBox(height: context.spacing.sm),
                              TextFormField(
                                initialValue: _minimumOverdueAmount,
                                decoration: InputDecoration(
                                  prefixText: '\$ ',
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: context.spacing.md,
                                    vertical: context.spacing.sm,
                                  ),
                                ),
                                keyboardType: TextInputType.number,
                              ),
                            ],
                          ),
                        ),
                        SizedBox(width: context.spacing.lg),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'GRACE PERIOD',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              SizedBox(height: context.spacing.sm),
                              TextFormField(
                                initialValue: _gracePeriodDays,
                                decoration: InputDecoration(
                                  suffixText: 'days',
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: context.spacing.md,
                                    vertical: context.spacing.sm,
                                  ),
                                ),
                                keyboardType: TextInputType.number,
                                inputFormatters: [
                                  FilteringTextInputFormatter.digitsOnly
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
              activeColor: AppColors.success,
              contentPadding: EdgeInsets.zero,
            ),
          ],
        ),
      ),
    );
  }

  /// Build Credit Hold Section
  Widget _buildCreditHoldSection() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: EdgeInsets.all(context.spacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: Colors.red[700],
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.remove, color: Colors.white, size: 14),
                ),
                SizedBox(width: context.spacing.sm),
                Text(
                  'Credit Hold',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            SizedBox(height: context.spacing.sm),
            Text(
              'Select which actions can be taken on a customer that\'s on credit hold.',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
            SizedBox(height: context.spacing.lg),

            // Quotes
            _buildCreditHoldOption(
              'Quotes',
              'Create Quotes',
              _createQuotes,
              (value) {
                setState(() {
                  _createQuotes = value;
                });
              },
            ),
            SizedBox(height: context.spacing.lg),

            // Jobs
            _buildCreditHoldOption(
              'Jobs',
              'Create Jobs',
              _createJobs,
              (value) {
                setState(() {
                  _createJobs = value;
                });
              },
            ),
            SizedBox(height: context.spacing.lg),

            // Service Agreements
            _buildCreditHoldOption(
              'Service Agreements',
              'Create Maintenance',
              _createMaintenance,
              (value) {
                setState(() {
                  _createMaintenance = value;
                });
              },
              note:
                  'Note: When set to OFF, automatically generated maintenances will be assigned "Credit Hold" status and NO maintenance creation will be restricted.',
            ),
            SizedBox(height: context.spacing.lg),

            // Projects
            _buildCreditHoldOption(
              'Projects',
              'Create Projects',
              _createProjects,
              (value) {
                setState(() {
                  _createProjects = value;
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Build Credit Hold Option
  Widget _buildCreditHoldOption(
    String category,
    String label,
    bool value,
    ValueChanged<bool> onChanged, {
    String? note,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          category,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
        SizedBox(height: context.spacing.sm),
        Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
            Switch(
              value: value,
              onChanged: onChanged,
              activeColor: AppColors.success,
            ),
          ],
        ),
        if (note != null) ...[
          SizedBox(height: context.spacing.sm),
          Text(
            note,
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ],
    );
  }

  /// Build GL Accounts Tab
  Widget _buildGLAccountsTab() {
    return Column(
      children: [
        // Import Button
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
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.download, size: 18),
                label: const Text('IMPORT FROM QUICKBOOKS'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: AppColors.white,
                  padding: EdgeInsets.symmetric(
                    horizontal: context.spacing.lg,
                    vertical: context.spacing.md,
                  ),
                ),
              ),
            ],
          ),
        ),

        // Data Table
        Expanded(
          child: SingleChildScrollView(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columnSpacing: 60,
                headingRowColor: MaterialStateProperty.all(
                  AppColors.backgroundLight,
                ),
                columns: const [
                  DataColumn(
                    label: Text(
                      'Account Number',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Account Description',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Account Type',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Default',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
                rows: _glAccounts.map((account) {
                  return DataRow(
                    cells: [
                      DataCell(Text(account['number'] ?? '')),
                      DataCell(
                        SizedBox(
                          width: 300,
                          child: Text(account['description'] ?? ''),
                        ),
                      ),
                      DataCell(Text(account['type'] ?? '')),
                      DataCell(Text(account['default'] ?? '')),
                    ],
                  );
                }).toList(),
              ),
            ),
          ),
        ),

        // Pagination
        Container(
          padding: EdgeInsets.all(context.spacing.md),
          decoration: BoxDecoration(
            color: AppColors.white,
            border: Border(
              top: BorderSide(
                color: AppColors.border,
                width: 1,
              ),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '1-25 OF 335',
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
              Row(
                children: [
                  Text(
                    'Rows being shown:',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  SizedBox(width: context.spacing.sm),
                  DropdownButton<int>(
                    value: 25,
                    items: const [
                      DropdownMenuItem(value: 25, child: Text('25')),
                      DropdownMenuItem(value: 50, child: Text('50')),
                      DropdownMenuItem(value: 100, child: Text('100')),
                    ],
                    onChanged: (value) {},
                    underline: Container(),
                  ),
                  SizedBox(width: context.spacing.lg),
                  OutlinedButton(
                    onPressed: () {},
                    child: const Text('SHOW MORE'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Build Classes Tab
  Widget _buildClassesTab() {
    return Column(
      children: [
        // Import Button
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
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.download, size: 18),
                label: const Text('IMPORT FROM QUICKBOOKS'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: AppColors.white,
                  padding: EdgeInsets.symmetric(
                    horizontal: context.spacing.lg,
                    vertical: context.spacing.md,
                  ),
                ),
              ),
            ],
          ),
        ),

        // Data Table
        Expanded(
          child: SingleChildScrollView(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columnSpacing: 200,
                headingRowColor: MaterialStateProperty.all(
                  AppColors.backgroundLight,
                ),
                columns: const [
                  DataColumn(
                    label: Text(
                      'Name',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Application',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
                rows: _classes.map((classItem) {
                  return DataRow(
                    cells: [
                      DataCell(
                        SizedBox(
                          width: 300,
                          child: Text(classItem['name'] ?? ''),
                        ),
                      ),
                      DataCell(Text(classItem['application'] ?? '')),
                    ],
                  );
                }).toList(),
              ),
            ),
          ),
        ),

        // Pagination
        Container(
          padding: EdgeInsets.all(context.spacing.md),
          decoration: BoxDecoration(
            color: AppColors.white,
            border: Border(
              top: BorderSide(
                color: AppColors.border,
                width: 1,
              ),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '1-7 OF 7',
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
              Row(
                children: [
                  Text(
                    'Rows being shown:',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  SizedBox(width: context.spacing.sm),
                  DropdownButton<int>(
                    value: 25,
                    items: const [
                      DropdownMenuItem(value: 25, child: Text('25')),
                      DropdownMenuItem(value: 50, child: Text('50')),
                      DropdownMenuItem(value: 100, child: Text('100')),
                    ],
                    onChanged: (value) {},
                    underline: Container(),
                  ),
                  SizedBox(width: context.spacing.lg),
                  OutlinedButton(
                    onPressed: null,
                    child: const Text('SHOW MORE'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Build Sales Tax Tab
  Widget _buildSalesTaxTab() {
    return Column(
      children: [
        // Import Button
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
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.download, size: 18),
                label: const Text('IMPORT FROM QUICKBOOKS'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: AppColors.white,
                  padding: EdgeInsets.symmetric(
                    horizontal: context.spacing.lg,
                    vertical: context.spacing.md,
                  ),
                ),
              ),
            ],
          ),
        ),

        // Empty State
        Expanded(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.receipt_long_outlined,
                  size: 64,
                  color: AppColors.textSecondary,
                ),
                SizedBox(height: context.spacing.md),
                Text(
                  'No tax rates',
                  style: TextStyle(
                    fontSize: 16,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),

        // Pagination Footer
        Container(
          padding: EdgeInsets.all(context.spacing.md),
          decoration: BoxDecoration(
            color: AppColors.white,
            border: Border(
              top: BorderSide(
                color: AppColors.border,
                width: 1,
              ),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '0 OF 0',
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
              Row(
                children: [
                  Text(
                    'Rows being shown:',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  SizedBox(width: context.spacing.sm),
                  DropdownButton<int>(
                    value: 25,
                    items: const [
                      DropdownMenuItem(value: 25, child: Text('25')),
                      DropdownMenuItem(value: 50, child: Text('50')),
                      DropdownMenuItem(value: 100, child: Text('100')),
                    ],
                    onChanged: (value) {},
                    underline: Container(),
                  ),
                  SizedBox(width: context.spacing.lg),
                  OutlinedButton(
                    onPressed: null,
                    child: const Text('SHOW MORE'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Build Placeholder Tab
  Widget _buildPlaceholderTab(String tabName) {
    return Center(
      child: Text(
        '$tabName coming soon',
        style: TextStyle(
          fontSize: 16,
          color: AppColors.textSecondary,
        ),
      ),
    );
  }
}
