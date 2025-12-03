/// MobileSettingsScreen - Mobile app configuration for field technicians
///
/// Features:
/// - Gated Workflows configuration
/// - Visit Report field requirements
/// - Procurement settings
/// - Self-Service Scheduling options
/// - General mobile app settings
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../../config/app_colors.dart';
import '../../widgets/organisms/organisms.dart';

class MobileSettingsScreen extends StatefulWidget {
  const MobileSettingsScreen({super.key});

  @override
  State<MobileSettingsScreen> createState() => _MobileSettingsScreenState();
}

class _MobileSettingsScreenState extends State<MobileSettingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // General Settings
  bool _allowUpdateOverdueEvents = true;
  bool _techsEditCurrentVisitOnly = false;
  bool _allowSelectAllAssets = false;

  // Gated Workflows - Visit Report Fields
  final Map<String, Map<String, bool>> _visitReportFields = {
    'Forms': {'required': false, 'allowBypass': false},
    'Additional notes (internal use)': {'required': false, 'allowBypass': false},
    'Timesheets': {'required': false, 'allowBypass': false},
    'Recommendations': {'required': false, 'allowBypass': false},
    'Assets worked on': {'required': false, 'allowBypass': false},
    'Before photos & videos': {'required': true, 'allowBypass': false},
    'Inventory parts/materials used': {'required': false, 'allowBypass': false},
    'Purchase orders': {'required': false, 'allowBypass': false},
    'After photos & videos': {'required': true, 'allowBypass': false},
    'Visit Summary': {'required': true, 'allowBypass': false},
    'Customer signature': {'required': false, 'allowBypass': false},
  };

  // Customer Signature Page Settings
  bool _showJobDescription = true;
  bool _showVisitDescription = true;
  bool _showVisitSummary = true;
  bool _showAssetsWorkedOn = true;
  bool _showInventoryItems = true;
  bool _showPurchaseOrders = true;
  bool _showVendorName = false;
  bool _showSubmittedHours = false;
  bool _requireTimeSheetsBeforeSignature = false;
  bool _showBeforeAfterPhotos = true;
  bool _showEquipmentUsed = false;

  // Procurement Settings
  bool _packingSlipImagesVisitsProjects = false;
  bool _requireReceiptLineItemsFieldOrders = true;
  bool _allowFieldOrdersFutureVisits = false;

  // Self-Service Scheduling
  bool _enableSelfScheduleVisits = false;
  bool _displayUnassignedJobs = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
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
      appBar: const AppHeader(pageTitle: 'Mobile Settings'),
      body: Column(
        children: [
          // Page header
          Padding(
            padding: spacing.paddingLG,
            child: Row(
              children: [
                Icon(Icons.phone_android, color: AppColors.success, size: 28),
                SizedBox(width: spacing.md),
                Text(
                  'Mobile Settings',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const Spacer(),
                // Show SAVE button only for tabs that need it
                if (_tabController.index == 0) // Gated Workflows
                  ElevatedButton.icon(
                    onPressed: () {
                      // TODO: Save settings
                    },
                    icon: const Icon(Icons.check_circle, size: 18),
                    label: const Text('SAVE'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 12,
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Tabs
          Container(
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(color: AppColors.border),
              ),
            ),
            child: TabBar(
              controller: _tabController,
              labelColor: AppColors.success,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.success,
              isScrollable: true,
              onTap: (index) {
                setState(() {}); // Refresh to show/hide SAVE button
              },
              tabs: const [
                Tab(text: 'Gated Workflows'),
                Tab(text: 'Visit Report'),
                Tab(text: 'Procurement'),
                Tab(text: 'Self-Service Scheduling'),
                Tab(text: 'General Settings'),
              ],
            ),
          ),

          // Tab content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildGatedWorkflowsTab(),
                _buildVisitReportTab(),
                _buildProcurementTab(),
                _buildSelfServiceSchedulingTab(),
                _buildGeneralSettingsTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGatedWorkflowsTab() {
    final spacing = context.spacing;

    return SingleChildScrollView(
      padding: spacing.paddingLG,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Visit Report Fields Section
          Text(
            'Specify fields required for tech visit reports',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),

          SizedBox(height: spacing.md),

          // Table header
          Container(
            padding: spacing.paddingMD,
            decoration: BoxDecoration(
              color: AppColors.surfaceLight,
              border: Border.all(color: AppColors.border),
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
                    'Field',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
                SizedBox(
                  width: 100,
                  child: Text(
                    'Required',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
                SizedBox(
                  width: 120,
                  child: Text(
                    'Allow Bypass',
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

          // Table rows
          ..._visitReportFields.entries.map((entry) {
            return Container(
              padding: spacing.paddingMD,
              decoration: BoxDecoration(
                border: Border(
                  left: BorderSide(color: AppColors.border),
                  right: BorderSide(color: AppColors.border),
                  bottom: BorderSide(color: AppColors.border),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: Text(
                      entry.key,
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  SizedBox(
                    width: 100,
                    child: Switch(
                      value: entry.value['required']!,
                      onChanged: (value) {
                        setState(() {
                          _visitReportFields[entry.key]!['required'] = value;
                        });
                      },
                      activeColor: AppColors.success,
                    ),
                  ),
                  SizedBox(
                    width: 120,
                    child: Switch(
                      value: entry.value['allowBypass']!,
                      onChanged: (value) {
                        setState(() {
                          _visitReportFields[entry.key]!['allowBypass'] = value;
                        });
                      },
                      activeColor: AppColors.success,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),

          SizedBox(height: spacing.xxl),

          // Customer Signature Page Section
          Text(
            'Specify the details that will be displayed to customers on the customer signature page',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),

          SizedBox(height: spacing.md),

          _buildCheckboxSetting(
            'Show Job Description',
            _showJobDescription,
            (value) => setState(() => _showJobDescription = value),
          ),
          _buildCheckboxSetting(
            'Show Visit Description',
            _showVisitDescription,
            (value) => setState(() => _showVisitDescription = value),
          ),
          _buildCheckboxSetting(
            'Show Visit Summary',
            _showVisitSummary,
            (value) => setState(() => _showVisitSummary = value),
          ),
          _buildCheckboxSetting(
            'Show Assets Worked On',
            _showAssetsWorkedOn,
            (value) => setState(() => _showAssetsWorkedOn = value),
          ),
          _buildCheckboxSetting(
            'Show Inventory Items Used',
            _showInventoryItems,
            (value) => setState(() => _showInventoryItems = value),
          ),
          _buildCheckboxSetting(
            'Show Purchase Orders',
            _showPurchaseOrders,
            (value) => setState(() => _showPurchaseOrders = value),
          ),
          Padding(
            padding: EdgeInsets.only(left: spacing.xl),
            child: _buildCheckboxSetting(
              'Show Vendor Name',
              _showVendorName,
              (value) => setState(() => _showVendorName = value),
            ),
          ),
          _buildCheckboxSetting(
            'Show Submitted Hours',
            _showSubmittedHours,
            (value) => setState(() => _showSubmittedHours = value),
          ),
          Padding(
            padding: EdgeInsets.only(left: spacing.xl),
            child: _buildCheckboxSetting(
              'Require Time Sheets Submission Before Collecting Customer Signature',
              _requireTimeSheetsBeforeSignature,
              (value) =>
                  setState(() => _requireTimeSheetsBeforeSignature = value),
            ),
          ),
          _buildCheckboxSetting(
            'Show Before & After Photos',
            _showBeforeAfterPhotos,
            (value) => setState(() => _showBeforeAfterPhotos = value),
          ),
          _buildCheckboxSetting(
            'Equipment Used',
            _showEquipmentUsed,
            (value) => setState(() => _showEquipmentUsed = value),
          ),

          SizedBox(height: spacing.xl),
        ],
      ),
    );
  }

  Widget _buildVisitReportTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.assignment, size: 64, color: AppColors.textSecondary),
          const SizedBox(height: 16),
          Text(
            'Visit Report Settings Coming Soon',
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

  Widget _buildProcurementTab() {
    final spacing = context.spacing;

    return SingleChildScrollView(
      padding: spacing.paddingLG,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Specify fields required for technicians to submit on jobs or projects',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),

          SizedBox(height: spacing.xl),

          // Packing Slip Images Section
          Container(
            padding: spacing.paddingLG,
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Packing Slip Images',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                SizedBox(height: spacing.md),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Visits & Projects',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Switch(
                      value: _packingSlipImagesVisitsProjects,
                      onChanged: (value) {
                        setState(
                          () => _packingSlipImagesVisitsProjects = value,
                        );
                      },
                      activeColor: AppColors.success,
                    ),
                  ],
                ),
              ],
            ),
          ),

          SizedBox(height: spacing.lg),

          // Require Receipt Line Items Section
          Container(
            padding: spacing.paddingLG,
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Require Receipt Line Items',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                SizedBox(height: spacing.md),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Field Orders',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Icon(
                      _requireReceiptLineItemsFieldOrders
                          ? Icons.check_circle
                          : Icons.circle_outlined,
                      color: _requireReceiptLineItemsFieldOrders
                          ? AppColors.success
                          : AppColors.textSecondary,
                      size: 24,
                    ),
                  ],
                ),
              ],
            ),
          ),

          SizedBox(height: spacing.xl),

          // Future Visits Section
          Text(
            'Specify fields that will be shown to Technicians on Future Visits',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),

          SizedBox(height: spacing.md),

          Container(
            padding: spacing.paddingLG,
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'Allow for Field Orders to be created for future visits',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Switch(
                  value: _allowFieldOrdersFutureVisits,
                  onChanged: (value) {
                    setState(() => _allowFieldOrdersFutureVisits = value);
                  },
                  activeColor: AppColors.success,
                ),
              ],
            ),
          ),

          SizedBox(height: spacing.xl),
        ],
      ),
    );
  }

  Widget _buildSelfServiceSchedulingTab() {
    final spacing = context.spacing;

    return SingleChildScrollView(
      padding: spacing.paddingLG,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Allow technicians to schedule themselves for visits',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),

          SizedBox(height: spacing.xl),

          Container(
            padding: spacing.paddingLG,
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Enable Technicians to self-schedule assigned visits',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Switch(
                      value: _enableSelfScheduleVisits,
                      onChanged: (value) {
                        setState(() => _enableSelfScheduleVisits = value);
                      },
                      activeColor: AppColors.success,
                    ),
                  ],
                ),
                SizedBox(height: spacing.md),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Display Unassigned Jobs',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Icon(
                      _displayUnassignedJobs
                          ? Icons.check_circle
                          : Icons.circle_outlined,
                      color: _displayUnassignedJobs
                          ? AppColors.success
                          : AppColors.textSecondary,
                      size: 24,
                    ),
                  ],
                ),
              ],
            ),
          ),

          SizedBox(height: spacing.xl),
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
          // Table header
          Container(
            padding: spacing.paddingMD,
            decoration: BoxDecoration(
              color: AppColors.surfaceLight,
              border: Border.all(color: AppColors.border),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(4),
                topRight: Radius.circular(4),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Field',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
                SizedBox(
                  width: 100,
                  child: Text(
                    'Required',
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

          // Settings rows
          _buildGeneralSettingRow(
            'Allow technicians to update overdue events',
            _allowUpdateOverdueEvents,
            (value) => setState(() => _allowUpdateOverdueEvents = value),
          ),
          _buildGeneralSettingRow(
            'Technicians can only edit current visit',
            _techsEditCurrentVisitOnly,
            (value) => setState(() => _techsEditCurrentVisitOnly = value),
          ),
          _buildGeneralSettingRow(
            'Allow technicians to Select All assets when identifying which assets they worked on.',
            _allowSelectAllAssets,
            (value) => setState(() => _allowSelectAllAssets = value),
            isLast: true,
          ),

          SizedBox(height: spacing.xl),
        ],
      ),
    );
  }

  Widget _buildGeneralSettingRow(
    String label,
    bool value,
    ValueChanged<bool> onChanged, {
    bool isLast = false,
  }) {
    final spacing = context.spacing;

    return Container(
      padding: spacing.paddingMD,
      decoration: BoxDecoration(
        border: Border(
          left: BorderSide(color: AppColors.border),
          right: BorderSide(color: AppColors.border),
          bottom: BorderSide(color: AppColors.border),
        ),
        borderRadius: isLast
            ? const BorderRadius.only(
                bottomLeft: Radius.circular(4),
                bottomRight: Radius.circular(4),
              )
            : null,
      ),
      child: Row(
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
          SizedBox(
            width: 100,
            child: Icon(
              value ? Icons.check_circle : Icons.circle_outlined,
              color: value ? AppColors.success : AppColors.textSecondary,
              size: 24,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCheckboxSetting(
    String label,
    bool value,
    ValueChanged<bool> onChanged,
  ) {
    final spacing = context.spacing;

    return Padding(
      padding: EdgeInsets.only(bottom: spacing.md),
      child: Row(
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
          Icon(
            value ? Icons.check_circle : Icons.circle_outlined,
            color: value ? AppColors.success : AppColors.textSecondary,
            size: 24,
          ),
        ],
      ),
    );
  }
}
