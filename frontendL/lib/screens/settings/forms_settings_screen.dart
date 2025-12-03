import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_spacing.dart';
import '../../widgets/organisms/app_header.dart';

/// Forms Settings Screen
/// Manages forms and checklists for jobs and tasks
class FormsSettingsScreen extends StatefulWidget {
  const FormsSettingsScreen({super.key});

  @override
  State<FormsSettingsScreen> createState() => _FormsSettingsScreenState();
}

class _FormsSettingsScreenState extends State<FormsSettingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Sample forms data
  final List<Map<String, String>> _forms = [
    {
      'name': 'In-Unit Inspection',
      'description': '',
      'viewType': 'PDF',
      'formType': 'Job',
      'lastUpdated': 'Aug 27, 2024 9:43am',
    },
    {
      'name': 'KG Flex Checklist',
      'description': 'Checklist for all properties within the KG Flex lineup.',
      'viewType': 'Document',
      'formType': 'Task',
      'lastUpdated': 'Jul 15, 2024 3:15pm',
    },
    {
      'name': 'Annual Domestic Booster Pump',
      'description': '',
      'viewType': 'Document',
      'formType': 'Task',
      'lastUpdated': 'Jul 8, 2024 1:09pm',
    },
    {
      'name': 'Annual Garage CO Sensors',
      'description': '',
      'viewType': 'Document',
      'formType': 'Task',
      'lastUpdated': 'Jul 8, 2024 1:12pm',
    },
    {
      'name': 'Annual HP - Heat Pump',
      'description': '',
      'viewType': 'Document',
      'formType': 'Task',
      'lastUpdated': 'Jul 8, 2024 1:13pm',
    },
    {
      'name': 'Semi-Annual CT - Cooling Tower',
      'description': '',
      'viewType': 'Document',
      'formType': 'Task',
      'lastUpdated': 'Jul 8, 2024 1:15pm',
    },
    {
      'name': 'Quarterly SPF - Stair Pressurization Fan',
      'description': '',
      'viewType': 'Document',
      'formType': 'Task',
      'lastUpdated': 'Jul 8, 2024 1:16pm',
    },
    {
      'name': 'Monthly Cooling Tower',
      'description': '',
      'viewType': 'Document',
      'formType': 'Task',
      'lastUpdated': 'Jul 8, 2024 1:16pm',
    },
    {
      'name': 'Quarterly Chilled Water Pump',
      'description': '',
      'viewType': 'Document',
      'formType': 'Task',
      'lastUpdated': 'Jun 28, 2024 11:47am',
    },
    {
      'name': 'Weekly Engineering Walk',
      'description': 'Checklist for weekly walk.',
      'viewType': 'Document',
      'formType': 'Task',
      'lastUpdated': 'Jun 28, 2024 10:31am',
    },
    {
      'name': 'OSHA 1910.334 - Cords',
      'description': 'OSHA Cords',
      'viewType': 'Document',
      'formType': 'Task',
      'lastUpdated': 'Jun 19, 2024 10:46am',
    },
    {
      'name': 'OSHA 1917119 - Ladders',
      'description': 'OSHA Standards for Ladders',
      'viewType': 'Document',
      'formType': 'Task',
      'lastUpdated': 'Jun 19, 2024 10:47am',
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
    return Scaffold(
      appBar: const AppHeader(
        pageTitle: 'Forms Settings',
      ),
      body: Column(
        children: [
          // Page Header
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
                  'Forms',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.add_circle_outline, size: 18),
                  label: const Text('CREATE NEW FORM'),
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

          // Tabs
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
              labelColor: AppColors.success,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.success,
              indicatorWeight: 3,
              tabs: const [
                Tab(text: 'Published'),
                Tab(text: 'Draft'),
              ],
            ),
          ),

          // Tab Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildPublishedTab(),
                _buildDraftTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Build Published Tab
  Widget _buildPublishedTab() {
    return Column(
      children: [
        // Toolbar
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
              // Views
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
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
                  SizedBox(height: context.spacing.sm),
                  SizedBox(
                    width: 200,
                    child: DropdownButtonFormField<String>(
                      value: 'Standard View',
                      decoration: InputDecoration(
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: context.spacing.md,
                          vertical: context.spacing.sm,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(4),
                          borderSide: BorderSide(color: AppColors.border),
                        ),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'Standard View',
                          child: Text('Standard View'),
                        ),
                      ],
                      onChanged: (value) {},
                    ),
                  ),
                ],
              ),
              SizedBox(width: context.spacing.lg),
              _buildToolbarButton('COLUMNS'),
              SizedBox(width: context.spacing.md),
              _buildToolbarButton('DENSITY'),
              SizedBox(width: context.spacing.md),
              _buildToolbarButton('FILTERS'),
            ],
          ),
        ),

        // Data Table
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SingleChildScrollView(
              child: DataTable(
                columnSpacing: 40,
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
                      'Description',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'View Type',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Form Type',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Last Updated',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Archived',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Actions',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
                rows: _forms.map((form) {
                  return DataRow(
                    cells: [
                      DataCell(
                        SizedBox(
                          width: 250,
                          child: Text(
                            form['name'] ?? '',
                            style: const TextStyle(fontWeight: FontWeight.w500),
                          ),
                        ),
                      ),
                      DataCell(
                        SizedBox(
                          width: 350,
                          child: Text(
                            form['description'] ?? '',
                            style: TextStyle(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                      DataCell(
                        Text(
                          form['viewType'] ?? '',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      DataCell(
                        Text(
                          form['formType'] ?? '',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      DataCell(
                        Text(
                          form['lastUpdated'] ?? '',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      DataCell(
                        Icon(
                          Icons.close,
                          size: 18,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      DataCell(
                        IconButton(
                          icon: Icon(
                            Icons.more_vert,
                            color: AppColors.textSecondary,
                          ),
                          onPressed: () {},
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
          ),
        ),
      ],
    );
  }

  /// Build Draft Tab
  Widget _buildDraftTab() {
    return Center(
      child: Text(
        'No draft forms',
        style: TextStyle(
          fontSize: 16,
          color: AppColors.textSecondary,
        ),
      ),
    );
  }

  /// Build Toolbar Button
  Widget _buildToolbarButton(String label) {
    return OutlinedButton.icon(
      onPressed: () {},
      icon: const Icon(Icons.arrow_drop_down, size: 18),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        padding: EdgeInsets.symmetric(
          horizontal: context.spacing.md,
          vertical: context.spacing.sm,
        ),
      ),
    );
  }
}
