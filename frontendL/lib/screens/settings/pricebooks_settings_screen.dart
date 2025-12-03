/// PricebooksSettingsScreen - Pricing and rate card management
///
/// Features:
/// - Pricebook management with table view
/// - Status tracking (Active/Archived)
/// - Base markup and margin configuration
/// - Default pricebook designation
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../../config/app_colors.dart';
import '../../widgets/organisms/organisms.dart';
import '../../widgets/molecules/cards/page_header.dart';

class PricebooksSettingsScreen extends StatefulWidget {
  const PricebooksSettingsScreen({super.key});

  @override
  State<PricebooksSettingsScreen> createState() =>
      _PricebooksSettingsScreenState();
}

class _PricebooksSettingsScreenState extends State<PricebooksSettingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedView = 'Standard View';
  int _rowsPerPage = 25;

  // Sample pricebook data matching BuildOps
  final List<Map<String, dynamic>> _pricebooks = [
    {
      'name': 'On Demand Service',
      'description': 'For services where our base amount is \$89/hour',
      'status': 'Active',
      'baseMarkup': 30.0,
      'baseMargin': 23.07692,
      'isDefault': false,
    },
    {
      'name': 'Tross - Casey Unit Special',
      'description': 'Pricebook that is for the Tross Casey Unit Special program.',
      'status': 'Active',
      'baseMarkup': 0.0,
      'baseMargin': 0.0,
      'isDefault': false,
    },
    {
      'name': 'Arke Blocks',
      'description': 'Price books for BBP, BB1, BB3, BB4, BB5',
      'status': 'Archived',
      'baseMarkup': 0.0,
      'baseMargin': 0.0,
      'isDefault': false,
    },
    {
      'name': 'Tross Standard Rates',
      'description': 'Standard rates for all Tross Services',
      'status': 'Active',
      'baseMarkup': 0.0,
      'baseMargin': 0.0,
      'isDefault': true,
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
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
      appBar: const AppHeader(pageTitle: 'Pricebooks'),
      body: Column(
        children: [
          // Page header
          Padding(
            padding: spacing.paddingLG,
            child: Row(
              children: [
                Icon(Icons.settings, color: AppColors.brandPrimary, size: 28),
                SizedBox(width: spacing.md),
                Text(
                  'Pricebooks',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: () {
                    // TODO: Add pricebook
                  },
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('ADD PRICEBOOK'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
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
              labelColor: AppColors.brandPrimary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.brandPrimary,
              tabs: const [
                Tab(text: 'Pricebooks'),
                Tab(text: 'Settings'),
              ],
            ),
          ),

          // Tab content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildPricebooksTab(),
                _buildSettingsTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPricebooksTab() {
    final spacing = context.spacing;

    return Column(
      children: [
        // View controls
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
              Text(
                'VIEWS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                  letterSpacing: 0.5,
                ),
              ),
              SizedBox(width: spacing.sm),
              DropdownButton<String>(
                value: _selectedView,
                items: ['Standard View', 'Active Only', 'Archived Only']
                    .map((view) {
                  return DropdownMenuItem(
                    value: view,
                    child: Text(view),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() => _selectedView = value!);
                },
                underline: const SizedBox(),
              ),
              SizedBox(width: spacing.md),
              TextButton(
                onPressed: () {
                  // TODO: Adjust columns
                },
                child: Text(
                  'ADJUST COLUMNS',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              SizedBox(width: spacing.sm),
              TextButton(
                onPressed: () {
                  // TODO: Set filters
                },
                child: Text(
                  'SET FILTERS',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
        ),

        // Data table
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SingleChildScrollView(
              child: DataTable(
                headingRowColor: MaterialStateProperty.all(
                  AppColors.surfaceLight,
                ),
                columns: [
                  DataColumn(
                    label: Text(
                      'Name',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Description',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Status',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Base Markup',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Base Margin',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Default',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Actions',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ],
                rows: _pricebooks.map((pricebook) {
                  return DataRow(
                    cells: [
                      DataCell(
                        InkWell(
                          onTap: () {
                            // TODO: View/edit pricebook
                          },
                          child: Text(
                            pricebook['name'],
                            style: TextStyle(
                              color: AppColors.brandPrimary,
                              decoration: TextDecoration.underline,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                      DataCell(
                        Text(pricebook['description']),
                      ),
                      DataCell(
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: pricebook['status'] == 'Active'
                                ? AppColors.success.withOpacity(0.1)
                                : AppColors.error.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            pricebook['status'],
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: pricebook['status'] == 'Active'
                                  ? AppColors.success
                                  : AppColors.error,
                            ),
                          ),
                        ),
                      ),
                      DataCell(
                        Text('${pricebook['baseMarkup'].toStringAsFixed(0)}%'),
                      ),
                      DataCell(
                        Text('${pricebook['baseMargin'].toStringAsFixed(pricebook['baseMargin'] == 0 ? 0 : 5)}%'),
                      ),
                      DataCell(
                        pricebook['isDefault']
                            ? Text(
                                'Default pricebook',
                                style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 13,
                                ),
                              )
                            : OutlinedButton(
                                onPressed: () {
                                  // TODO: Set as default
                                },
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
                                  ),
                                ),
                                child: const Text(
                                  'SET AS DEFAULT',
                                  style: TextStyle(fontSize: 11),
                                ),
                              ),
                      ),
                      DataCell(
                        IconButton(
                          icon: const Icon(Icons.more_vert, size: 20),
                          onPressed: () {
                            // TODO: Show actions menu
                          },
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
          ),
        ),

        // Pagination footer
        Container(
          padding: spacing.paddingMD,
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(color: AppColors.border),
            ),
          ),
          child: Row(
            children: [
              Text(
                'Rows being shown:',
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
              SizedBox(width: spacing.sm),
              DropdownButton<int>(
                value: _rowsPerPage,
                items: [10, 25, 50, 100].map((rows) {
                  return DropdownMenuItem(
                    value: rows,
                    child: Text(rows.toString()),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() => _rowsPerPage = value!);
                },
                underline: const SizedBox(),
              ),
              const Spacer(),
              Text(
                '1-${_pricebooks.length} OF ${_pricebooks.length}',
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
              SizedBox(width: spacing.md),
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: null,
                color: AppColors.textSecondary,
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: null,
                color: AppColors.textSecondary,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSettingsTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.settings, size: 64, color: AppColors.textSecondary),
          const SizedBox(height: 16),
          Text(
            'Pricebook Settings Coming Soon',
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
}
