import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_spacing.dart';
import '../../widgets/organisms/app_header.dart';

/// Equipment & Assets Screen
/// Tracks and manages company equipment and assets
class EquipmentAssetsScreen extends StatefulWidget {
  const EquipmentAssetsScreen({super.key});

  @override
  State<EquipmentAssetsScreen> createState() => _EquipmentAssetsScreenState();
}

class _EquipmentAssetsScreenState extends State<EquipmentAssetsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedStatus = 'All Statuses';
  String _selectedCondition = 'All Conditions';

  // Sample assets data
  final List<Map<String, dynamic>> _assets = [
    {
      'assetNumber': 'FIRE-001',
      'name': 'Fire Suppression System',
      'model': 'Tyco TY-FP-12M',
      'category': 'Fire Safety',
      'subcategory': 'Sprinkler System',
      'status': 'Active',
      'condition': 'Good',
      'location': 'Warehouse Facility #3, Throughout',
      'customer': 'Logistics Distribution Center',
      'nextService': 'May 22, 2026',
    },
    {
      'assetNumber': 'BUILD-001',
      'name': 'Passenger Elevator',
      'model': 'Otis Gen2-MRL',
      'category': 'Building Equipment',
      'subcategory': 'BOTTOM OVERLOADED BY 6.0 PIXELS',
      'status': 'In Service',
      'condition': 'Good',
      'location': 'Professional Center, Central Core',
      'customer': 'Professional Center Management',
      'nextService': 'Nov 28, 2025',
    },
    {
      'assetNumber': 'REFR-002',
      'name': 'Display Case Refrigeration',
      'model': 'Hussmann RL-S-12L',
      'category': 'Refrigeration',
      'subcategory': 'Display Case',
      'status': 'In Service',
      'condition': 'Fair',
      'location': 'Convenience Store #42, Sales Floor',
      'customer': 'QuickStop Markets',
      'nextService': 'Feb 1, 2026',
    },
    {
      'assetNumber': 'REFR-001',
      'name': 'Walk-in Cooler',
      'model': 'Kolpak KF7-0810-FR',
      'category': 'Refrigeration',
      'subcategory': 'Walk-in Cooler',
      'status': 'In Service',
      'condition': 'Good',
      'location': 'Fresh Market Grocery, Back Storage',
      'customer': 'Fresh Market Grocery',
      'nextService': 'Jan 2, 2026',
    },
    {
      'assetNumber': 'PLUMB-002',
      'name': 'Booster Pump System',
      'model': 'Grundfos HYDRO MPC-E',
      'category': 'Plumbing',
      'subcategory': 'Pump System',
      'status': 'In Service',
      'condition': 'Excellent',
      'location': 'City Tower, Basement Level',
      'customer': 'City Tower Management',
      'nextService': 'Jan 17, 2026',
    },
    {
      'assetNumber': 'PLUMB-001',
      'name': 'Commercial Water Heater',
      'model': 'Bradford White MJ-80T6FBN',
      'category': 'Plumbing',
      'subcategory': 'Water Heater',
      'status': 'In Service',
      'condition': 'Good',
      'location': 'Office Complex B, Mechanical Room',
      'customer': 'Downtown Office Plaza',
      'nextService': 'Feb 16, 2026',
    },
    {
      'assetNumber': 'ELEC-002',
      'name': 'Emergency Generator',
      'model': 'Generac RG080-4ANAX',
      'category': 'Electrical',
      'subcategory': 'Generator',
      'status': 'In Service',
      'condition': 'Excellent',
      'location': 'Medical Center, Generator Pad',
      'customer': 'Riverside Medical Center',
      'nextService': 'Feb 1, 2026',
    },
    {
      'assetNumber': 'ELEC-001',
      'name': 'Main Distribution Panel',
      'model': 'Square D NF424L3',
      'category': 'Electrical',
      'subcategory': 'Distribution Panel',
      'status': 'Active',
      'condition': 'Good',
      'location': '500 Industrial Way, Main Electrical Room',
      'customer': 'Manufacturing Plant A',
      'nextService': 'May 17, 2026',
    },
    {
      'assetNumber': 'HVAC-006',
      'name': 'Chiller System - Data Center',
      'model': 'Liebert DS-150',
      'category': 'HVAC',
      'subcategory': 'Chiller',
      'status': 'Maintenance',
      'condition': 'Fair',
      'location': 'Tech Park Building 5, Data Center',
      'customer': 'Cloud Services Inc',
      'nextService': 'Dec 18, 2025',
    },
    {
      'assetNumber': 'HVAC-005',
      'name': 'Split System AC - Office Suite',
      'model': 'Daikin DX18TC',
      'category': 'HVAC',
      'subcategory': 'Split System',
      'status': 'In Service',
      'condition': 'Excellent',
      'location': '1200 Main Street, Floor 3',
      'customer': 'Professional Services Group',
      'nextService': 'Jan 17, 2026',
    },
    {
      'assetNumber': 'HVAC-004',
      'name': 'Commercial Rooftop Unit',
      'model': 'Carrier 48VL-A12',
      'category': 'HVAC',
      'subcategory': 'Rooftop Unit',
      'status': 'In Service',
      'condition': 'Good',
      'location': '2500 Commerce Drive, Warehouse Roof',
      'customer': 'Distribution Center LLC',
      'nextService': 'Jan 2, 2026',
    },
    {
      'assetNumber': 'HVAC-003',
      'name': 'Factory Floor HVAC',
      'model': 'Lennox CBX32MV-036',
      'category': 'HVAC',
      'subcategory': 'Industrial Air\nBOTTOM OVERLOADED BY 6.0 PIXELS\nHVAC',
      'status': 'In Service',
      'condition': '',
      'location': '8900 Industrial Parkway',
      'customer': 'Portland Manufacturing Inc.',
      'nextService': '-',
    },
    {
      'assetNumber': 'HVAC-002',
      'name': 'Residential HVAC',
      'model': 'Trane XR14',
      'category': 'HVAC',
      'subcategory': 'Residential Air\nBOTTOM OVERLOADED BY 6.0 PIXELS',
      'status': 'In Service',
      'condition': '',
      'location': '742 Maple Street',
      'customer': 'Johnson Residence',
      'nextService': '-',
    },
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppHeader(
        pageTitle: 'Equipment & Assets',
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Page Title and Stats Cards
          Padding(
            padding: EdgeInsets.all(context.spacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Equipment & Assets',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                SizedBox(height: context.spacing.lg),

                // Stats Cards
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildStatCard('Total Assets', '14', Colors.grey[300]!, Colors.black87),
                      SizedBox(width: context.spacing.md),
                      _buildStatCard('Active', '2', Colors.green[100]!, Colors.green[700]!),
                      SizedBox(width: context.spacing.md),
                      _buildStatCard('In Service', '11', Colors.blue[100]!, Colors.blue[700]!),
                      SizedBox(width: context.spacing.md),
                      _buildStatCard('Under Warranty', '7', Colors.purple[100]!, Colors.purple[700]!),
                      SizedBox(width: context.spacing.md),
                      _buildStatCard('Service Due Soon', '2', Colors.orange[100]!, Colors.orange[700]!),
                      SizedBox(width: context.spacing.md),
                      _buildStatCard('Service Overdue', '0', Colors.red[100]!, Colors.red[700]!),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Search and Filters
          Container(
            padding: EdgeInsets.all(context.spacing.lg),
            decoration: BoxDecoration(
              color: AppColors.white,
              border: Border(
                top: BorderSide(color: AppColors.border),
                bottom: BorderSide(color: AppColors.border),
              ),
            ),
            child: Row(
              children: [
                // Search
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search assets...',
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
                ),
                SizedBox(width: context.spacing.md),

                // Status Filter
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Status',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      SizedBox(height: context.spacing.xs),
                      DropdownButtonFormField<String>(
                        value: _selectedStatus,
                        decoration: InputDecoration(
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(4),
                          ),
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: context.spacing.md,
                            vertical: context.spacing.sm,
                          ),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'All Statuses', child: Text('All Statuses')),
                          DropdownMenuItem(value: 'Active', child: Text('Active')),
                          DropdownMenuItem(value: 'In Service', child: Text('In Service')),
                          DropdownMenuItem(value: 'Maintenance', child: Text('Maintenance')),
                        ],
                        onChanged: (value) {
                          setState(() {
                            _selectedStatus = value!;
                          });
                        },
                      ),
                    ],
                  ),
                ),
                SizedBox(width: context.spacing.md),

                // Condition Filter
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Condition',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      SizedBox(height: context.spacing.xs),
                      DropdownButtonFormField<String>(
                        value: _selectedCondition,
                        decoration: InputDecoration(
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(4),
                          ),
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: context.spacing.md,
                            vertical: context.spacing.sm,
                          ),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'All Conditions', child: Text('All Conditions')),
                          DropdownMenuItem(value: 'Excellent', child: Text('Excellent')),
                          DropdownMenuItem(value: 'Good', child: Text('Good')),
                          DropdownMenuItem(value: 'Fair', child: Text('Fair')),
                        ],
                        onChanged: (value) {
                          setState(() {
                            _selectedCondition = value!;
                          });
                        },
                      ),
                    ],
                  ),
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
                  columnSpacing: 20,
                  headingRowColor: MaterialStateProperty.all(AppColors.backgroundLight),
                  columns: const [
                    DataColumn(label: Text('Asset #', style: TextStyle(fontWeight: FontWeight.w600))),
                    DataColumn(label: Text('Name', style: TextStyle(fontWeight: FontWeight.w600))),
                    DataColumn(label: Text('Category', style: TextStyle(fontWeight: FontWeight.w600))),
                    DataColumn(label: Text('Status', style: TextStyle(fontWeight: FontWeight.w600))),
                    DataColumn(label: Text('Condition', style: TextStyle(fontWeight: FontWeight.w600))),
                    DataColumn(label: Text('Location', style: TextStyle(fontWeight: FontWeight.w600))),
                    DataColumn(label: Text('Customer', style: TextStyle(fontWeight: FontWeight.w600))),
                    DataColumn(label: Text('Next Service', style: TextStyle(fontWeight: FontWeight.w600))),
                    DataColumn(label: Text('Actions', style: TextStyle(fontWeight: FontWeight.w600))),
                  ],
                  rows: _assets.map((asset) {
                    return DataRow(
                      cells: [
                        DataCell(Text(asset['assetNumber'] ?? '')),
                        DataCell(
                          SizedBox(
                            width: 180,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  asset['name'] ?? '',
                                  style: const TextStyle(fontWeight: FontWeight.w500),
                                ),
                                if (asset['model'] != null && asset['model'].isNotEmpty)
                                  Text(
                                    asset['model'],
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                        DataCell(
                          SizedBox(
                            width: 140,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  asset['category'] ?? '',
                                  style: const TextStyle(fontWeight: FontWeight.w500),
                                ),
                                if (asset['subcategory'] != null && asset['subcategory'].isNotEmpty)
                                  Text(
                                    asset['subcategory'],
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                        DataCell(_buildStatusBadge(asset['status'] ?? '')),
                        DataCell(_buildConditionBadge(asset['condition'] ?? '')),
                        DataCell(
                          SizedBox(
                            width: 200,
                            child: Text(asset['location'] ?? ''),
                          ),
                        ),
                        DataCell(
                          SizedBox(
                            width: 180,
                            child: Text(asset['customer'] ?? ''),
                          ),
                        ),
                        DataCell(Text(asset['nextService'] ?? '-')),
                        DataCell(
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.visibility_outlined, size: 20),
                                onPressed: () {},
                                tooltip: 'View',
                              ),
                              IconButton(
                                icon: const Icon(Icons.edit_outlined, size: 20),
                                onPressed: () {},
                                tooltip: 'Edit',
                              ),
                            ],
                          ),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ),

          // Pagination Footer
          Container(
            padding: EdgeInsets.all(context.spacing.lg),
            decoration: BoxDecoration(
              color: AppColors.white,
              border: Border(
                top: BorderSide(color: AppColors.border),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Showing 1 - ${_assets.length} of ${_assets.length}',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.chevron_left),
                      onPressed: null,
                      tooltip: 'Previous',
                    ),
                    Text(
                      'P',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    SizedBox(width: context.spacing.md),
                    ElevatedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('New Asset'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.brandPrimary,
                        foregroundColor: AppColors.white,
                        padding: EdgeInsets.symmetric(
                          horizontal: context.spacing.lg,
                          vertical: context.spacing.md,
                        ),
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
  }

  /// Build Stat Card
  Widget _buildStatCard(String label, String value, Color bgColor, Color textColor) {
    return Container(
      width: 180,
      padding: EdgeInsets.all(context.spacing.lg),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: textColor.withOpacity(0.8),
            ),
          ),
          SizedBox(height: context.spacing.xs),
          Text(
            value,
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }

  /// Build Status Badge
  Widget _buildStatusBadge(String status) {
    Color bgColor;
    Color textColor;

    switch (status) {
      case 'Active':
        bgColor = Colors.green;
        textColor = Colors.white;
        break;
      case 'In Service':
        bgColor = Colors.blue;
        textColor = Colors.white;
        break;
      case 'Maintenance':
        bgColor = Colors.purple;
        textColor = Colors.white;
        break;
      default:
        bgColor = Colors.grey;
        textColor = Colors.white;
    }

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: context.spacing.md,
        vertical: context.spacing.xs,
      ),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        status,
        style: TextStyle(
          fontSize: 12,
          color: textColor,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  /// Build Condition Badge
  Widget _buildConditionBadge(String condition) {
    if (condition.isEmpty) return const Text('-');

    Color bgColor;
    Color textColor;

    switch (condition) {
      case 'Excellent':
        bgColor = Colors.green;
        textColor = Colors.white;
        break;
      case 'Good':
        bgColor = Colors.green.shade600;
        textColor = Colors.white;
        break;
      case 'Fair':
        bgColor = Colors.orange;
        textColor = Colors.white;
        break;
      default:
        bgColor = Colors.grey;
        textColor = Colors.white;
    }

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: context.spacing.md,
        vertical: context.spacing.xs,
      ),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        condition,
        style: TextStyle(
          fontSize: 12,
          color: textColor,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
