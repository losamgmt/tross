import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_spacing.dart';
import '../../widgets/organisms/app_header.dart';

/// Item List Settings Screen
/// Manages inventory items, services, and products with categorization
class ItemListSettingsScreen extends StatefulWidget {
  const ItemListSettingsScreen({super.key});

  @override
  State<ItemListSettingsScreen> createState() => _ItemListSettingsScreenState();
}

class _ItemListSettingsScreenState extends State<ItemListSettingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _categorySearchController = TextEditingController();

  // Category filters
  final Map<String, bool> _categories = {
    'Cleaning': false,
    'Fee': false,
    'HVAC': false,
    'Labor': false,
    'Lighting': false,
    'Plumbing': false,
    'Uncategorized': false,
    'Uniforms': false,
  };

  // Sample items data
  final List<Map<String, String>> _items = [
    {
      'attribute': 'Field Tech',
      'name': 'Build',
      'vendor': '',
      'description': 'Labor',
      'productCode': '',
      'itemType': 'Non-inventory',
      'category': 'Labor',
      'subcategory': 'T&M',
    },
    {
      'attribute': 'Lighting',
      'name': 'Lighting',
      'vendor': '',
      'description': 'Contract Services',
      'productCode': '',
      'itemType': 'Non-inventory',
      'category': 'Labor',
      'subcategory': 'Contract',
    },
    {
      'attribute': 'Service',
      'name': 'Maintenance',
      'vendor': '',
      'description': 'Contract Services',
      'productCode': '',
      'itemType': 'Non-inventory',
      'category': 'Labor',
      'subcategory': 'Contract',
    },
    {
      'attribute': 'Interior Porter',
      'name': 'Interior Porter',
      'vendor': '',
      'description': 'Contract Services',
      'productCode': '',
      'itemType': 'Non-inventory',
      'category': 'Labor',
      'subcategory': 'Contract',
    },
    {
      'attribute': 'Dock Manager',
      'name': 'Dock Management',
      'vendor': '',
      'description': 'Contract Services',
      'productCode': '',
      'itemType': 'Non-inventory',
      'category': 'Labor',
      'subcategory': 'Contract',
    },
    {
      'attribute': 'Uncategorized',
      'name': 'Electrical power adapters',
      'vendor': '',
      'description': 'Per Unit',
      'productCode': '',
      'itemType': 'Non-inventory',
      'category': 'Uncategorized',
      'subcategory': 'Uncategorized',
    },
    {
      'attribute': 'Uncategorized',
      'name': 'Electrical extension cords',
      'vendor': '',
      'description': 'Per Unit',
      'productCode': '',
      'itemType': 'Non-inventory',
      'category': 'Uncategorized',
      'subcategory': 'Uncategorized',
    },
    {
      'attribute': 'Uncategorized',
      'name': 'LED Snowflake',
      'vendor': '',
      'description': 'Per Unit',
      'productCode': '',
      'itemType': 'Non-inventory',
      'category': 'Uncategorized',
      'subcategory': 'Uncategorized',
    },
    {
      'attribute': 'Uncategorized',
      'name': 'Lighting Removal',
      'vendor': '',
      'description': 'Per Tree',
      'productCode': '',
      'itemType': 'Non-inventory',
      'category': 'Uncategorized',
      'subcategory': 'Uncategorized',
    },
    {
      'attribute': 'Uncategorized',
      'name': 'Installation of Lights',
      'vendor': '',
      'description': 'Per Tree',
      'productCode': '',
      'itemType': 'Non-inventory',
      'category': 'Uncategorized',
      'subcategory': 'Uncategorized',
    },
    {
      'attribute': 'Uncategorized',
      'name': 'Cancellation Fee',
      'vendor': '',
      'description': 'Late or No Notice',
      'productCode': '',
      'itemType': 'Non-inventory',
      'category': 'Uncategorized',
      'subcategory': 'Uncategorized',
    },
    {
      'attribute': 'Uncategorized',
      'name': 'Powercord 12G',
      'vendor': '',
      'description': 'Per ft',
      'productCode': '',
      'itemType': 'Non-inventory',
      'category': 'Uncategorized',
      'subcategory': 'Uncategorized',
    },
    {
      'attribute': 'Uncategorized',
      'name': 'Powercord 16G',
      'vendor': '',
      'description': 'Per ft',
      'productCode': '',
      'itemType': 'Non-inventory',
      'category': 'Uncategorized',
      'subcategory': 'Uncategorized',
    },
    {
      'attribute': 'Part',
      'name': '12G SOOW Power Cord',
      'vendor': '',
      'description': 'Per Linear ft',
      'productCode': 'HL',
      'itemType': 'Non-inventory',
      'category': 'Lighting',
      'subcategory': 'Holiday Lighting',
    },
    {
      'attribute': 'Uncategorized',
      'name': 'Extinguisher Disposal Fee',
      'vendor': '',
      'description': 'Per unit',
      'productCode': '',
      'itemType': 'Non-inventory',
      'category': 'Uncategorized',
      'subcategory': 'Uncategorized',
    },
    {
      'attribute': 'Uncategorized',
      'name': 'Patio Light Strand',
      'vendor': '',
      'description': 'Patio Light Strand per linear foot',
      'productCode': 'HL',
      'itemType': 'Non-inventory',
      'category': 'Uncategorized',
      'subcategory': 'Uncategorized',
    },
    {
      'attribute': 'Uncategorized',
      'name': 'Tape',
      'vendor': '',
      'description': 'Brown',
      'productCode': 'HL',
      'itemType': 'Non-inventory',
      'category': 'Uncategorized',
      'subcategory': 'Uncategorized',
    },
    {
      'attribute': 'Uncategorized',
      'name': '36 inch Coax power cord',
      'vendor': '',
      'description': 'Green',
      'productCode': 'HL',
      'itemType': 'Non-inventory',
      'category': 'Uncategorized',
      'subcategory': 'Uncategorized',
    },
    {
      'attribute': 'Uncategorized',
      'name': 'X /T / 8 way Connector',
      'vendor': '',
      'description': 'Per Unit - Green',
      'productCode': 'HL',
      'itemType': 'Non-inventory',
      'category': 'Uncategorized',
      'subcategory': 'Uncategorized',
    },
    {
      'attribute': 'Uncategorized',
      'name': 'Paracord (per unit)',
      'vendor': '',
      'description': '3\' section',
      'productCode': 'HL',
      'itemType': 'Non-inventory',
      'category': 'Uncategorized',
      'subcategory': 'Uncategorized',
    },
    {
      'attribute': 'Uncategorized',
      'name': 'Zip Ties',
      'vendor': '',
      'description': 'Zip Ties',
      'productCode': 'HL',
      'itemType': 'Non-inventory',
      'category': 'Uncategorized',
      'subcategory': 'Uncategorized',
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
    _searchController.dispose();
    _categorySearchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppHeader(
        pageTitle: 'Item List Settings',
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
                  'Item List',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('ADD ITEM'),
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
                Tab(text: 'Item List'),
                Tab(text: 'Categories'),
              ],
            ),
          ),

          // Tab Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildItemListTab(),
                _buildCategoriesTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Build Item List Tab
  Widget _buildItemListTab() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Left Sidebar - Category Filters
        Container(
          width: 250,
          decoration: BoxDecoration(
            color: AppColors.backgroundLight,
            border: Border(
              right: BorderSide(
                color: AppColors.border,
                width: 1,
              ),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Category Search
              Padding(
                padding: EdgeInsets.all(context.spacing.md),
                child: TextField(
                  controller: _categorySearchController,
                  decoration: InputDecoration(
                    hintText: 'Categories',
                    prefixIcon: Icon(Icons.search, color: AppColors.textSecondary),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(4),
                      borderSide: BorderSide(color: AppColors.border),
                    ),
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: context.spacing.md,
                      vertical: context.spacing.sm,
                    ),
                  ),
                ),
              ),

              // Select All / Clear All
              Padding(
                padding: EdgeInsets.symmetric(horizontal: context.spacing.md),
                child: Row(
                  children: [
                    OutlinedButton(
                      onPressed: () {
                        setState(() {
                          _categories.updateAll((key, value) => true);
                        });
                      },
                      style: OutlinedButton.styleFrom(
                        padding: EdgeInsets.symmetric(
                          horizontal: context.spacing.md,
                          vertical: context.spacing.xs,
                        ),
                        minimumSize: Size.zero,
                      ),
                      child: const Text('Select All', style: TextStyle(fontSize: 12)),
                    ),
                    SizedBox(width: context.spacing.sm),
                    OutlinedButton(
                      onPressed: () {
                        setState(() {
                          _categories.updateAll((key, value) => false);
                        });
                      },
                      style: OutlinedButton.styleFrom(
                        padding: EdgeInsets.symmetric(
                          horizontal: context.spacing.md,
                          vertical: context.spacing.xs,
                        ),
                        minimumSize: Size.zero,
                      ),
                      child: const Text('Clear All', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ),

              SizedBox(height: context.spacing.md),

              // Category List
              Expanded(
                child: ListView(
                  children: _categories.keys.map((category) {
                    return CheckboxListTile(
                      value: _categories[category],
                      onChanged: (value) {
                        setState(() {
                          _categories[category] = value ?? false;
                        });
                      },
                      title: Text(
                        category,
                        style: TextStyle(
                          fontSize: 14,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      controlAffinity: ListTileControlAffinity.leading,
                      dense: true,
                      activeColor: AppColors.success,
                      secondary: ['Labor', 'Lighting', 'Uncategorized'].contains(category)
                          ? Icon(Icons.chevron_right, size: 18, color: AppColors.textSecondary)
                          : null,
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),

        // Main Content Area
        Expanded(
          child: Column(
            children: [
              // Search and Toolbar
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Keyword Search
                    Text(
                      'KEYWORD SEARCH',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                        letterSpacing: 0.5,
                      ),
                    ),
                    SizedBox(height: context.spacing.sm),
                    TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        hintText: 'Search All Items',
                        prefixIcon: Icon(Icons.search, color: AppColors.textSecondary),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(4),
                          borderSide: BorderSide(color: AppColors.border),
                        ),
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: context.spacing.md,
                          vertical: context.spacing.md,
                        ),
                      ),
                    ),
                    SizedBox(height: context.spacing.lg),

                    // Views and Toolbar
                    Row(
                      children: [
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
                            DropdownButton<String>(
                              value: 'Standard View',
                              items: const [
                                DropdownMenuItem(
                                  value: 'Standard View',
                                  child: Text('Standard View'),
                                ),
                              ],
                              onChanged: (value) {},
                              underline: Container(),
                            ),
                          ],
                        ),
                        SizedBox(width: context.spacing.xl),
                        _buildToolbarButton('COLUMNS'),
                        SizedBox(width: context.spacing.md),
                        _buildToolbarButton('FILTERS'),
                        SizedBox(width: context.spacing.md),
                        _buildToolbarButton('DENSITY'),
                        const Spacer(),
                        OutlinedButton.icon(
                          onPressed: () {},
                          icon: const Icon(Icons.download, size: 16),
                          label: const Text('EXPORT'),
                          style: OutlinedButton.styleFrom(
                            padding: EdgeInsets.symmetric(
                              horizontal: context.spacing.md,
                              vertical: context.spacing.sm,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Data Table
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: SingleChildScrollView(
                    child: DataTable(
                      columns: [
                        DataColumn(label: Checkbox(value: false, onChanged: (v) {})),
                        const DataColumn(label: Text('Attribute')),
                        const DataColumn(label: Text('Item Name')),
                        const DataColumn(label: Text('Vendor')),
                        const DataColumn(label: Text('Description')),
                        const DataColumn(label: Text('Product Code')),
                        const DataColumn(label: Text('Item Type')),
                        const DataColumn(label: Text('Category')),
                        const DataColumn(label: Text('Subcategory')),
                      ],
                      rows: _items.map((item) {
                        return DataRow(
                          cells: [
                            DataCell(Checkbox(value: false, onChanged: (v) {})),
                            DataCell(Text(item['attribute'] ?? '')),
                            DataCell(Text(item['name'] ?? '')),
                            DataCell(Text(item['vendor'] ?? '')),
                            DataCell(Text(item['description'] ?? '')),
                            DataCell(Text(item['productCode'] ?? '')),
                            DataCell(Text(item['itemType'] ?? '')),
                            DataCell(Text(item['category'] ?? '')),
                            DataCell(Text(item['subcategory'] ?? '')),
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
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      'Rows per page:',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    SizedBox(width: context.spacing.sm),
                    DropdownButton<int>(
                      value: 100,
                      items: const [
                        DropdownMenuItem(value: 25, child: Text('25')),
                        DropdownMenuItem(value: 50, child: Text('50')),
                        DropdownMenuItem(value: 100, child: Text('100')),
                      ],
                      onChanged: (value) {},
                      underline: Container(),
                    ),
                    SizedBox(width: context.spacing.lg),
                    Text(
                      '1-${_items.length} of ${_items.length}',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    SizedBox(width: context.spacing.md),
                    IconButton(
                      icon: const Icon(Icons.chevron_left),
                      onPressed: null,
                      iconSize: 20,
                    ),
                    IconButton(
                      icon: const Icon(Icons.chevron_right),
                      onPressed: null,
                      iconSize: 20,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Build Categories Tab
  Widget _buildCategoriesTab() {
    return Center(
      child: Text(
        'Categories management coming soon',
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
