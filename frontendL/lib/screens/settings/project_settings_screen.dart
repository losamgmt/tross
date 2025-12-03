/// ProjectSettingsScreen - Project and job costing configuration
///
/// Features:
/// - Cost codes management
/// - Cost types configuration
/// - Project file folders setup
/// - Detailed job costing settings
/// - Default accounting items
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../../config/app_colors.dart';
import '../../widgets/organisms/organisms.dart';

class ProjectSettingsScreen extends StatefulWidget {
  const ProjectSettingsScreen({super.key});

  @override
  State<ProjectSettingsScreen> createState() => _ProjectSettingsScreenState();
}

class _ProjectSettingsScreenState extends State<ProjectSettingsScreen> {
  // Cost Codes data
  final List<Map<String, String>> _costCodes = [
    {'name': 'Labor', 'code': ''},
    {'name': 'Materials', 'code': ''},
  ];

  // Cost Types data
  final List<Map<String, String>> _costTypes = [
    {'name': 'Equipment', 'type': 'both'},
    {'name': 'Parking', 'type': 'both'},
    {'name': 'Materials', 'type': 'both'},
    {'name': 'Labor', 'type': 'both'},
    {'name': 'Contract Services', 'type': 'revenue'},
    {'name': 'Subcontractor', 'type': 'both'},
  ];

  // Project File Folders data
  final Map<String, List<String>> _projectFileFolders = {
    'Insurance': ['PM Files - Office Use Only'],
    'Drawings': [
      'PM Files - Office Use Only',
      'PM Files - Web Access',
      'PM Files - Mobile Access',
    ],
  };

  // Detailed job costing toggle
  bool _jobByJobBasis = true;

  // Default accounting items
  final Map<String, String> _accountingItems = {
    'RETAINAGE': '',
    'CHANGE ORDERS': '',
    'OVERHEAD (IF ASKED)': '',
    'TAX AND CO TAX': '',
  };

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return Scaffold(
      appBar: const AppHeader(pageTitle: 'Project Settings'),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Page header
            Padding(
              padding: spacing.paddingLG,
              child: Row(
                children: [
                  Icon(Icons.settings, color: AppColors.brandPrimary, size: 28),
                  SizedBox(width: spacing.md),
                  Text(
                    'Project Settings',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ),

            SizedBox(height: spacing.md),

            // General tab indicator
            Container(
              padding: spacing.paddingLG,
              decoration: BoxDecoration(
                color: AppColors.surfaceLight.withOpacity(0.5),
              ),
              child: Text(
                'General',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppColors.brandPrimary,
                ),
              ),
            ),

            SizedBox(height: spacing.xl),

            // Job Costing Section
            Padding(
              padding: spacing.paddingLG,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Job Costing',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: spacing.xl),

                  // Cost Codes Section
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  'Cost Codes',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.success,
                                  ),
                                ),
                                SizedBox(width: spacing.xs),
                                Icon(
                                  Icons.help_outline,
                                  size: 16,
                                  color: AppColors.textSecondary,
                                ),
                              ],
                            ),
                            SizedBox(height: spacing.md),
                            ..._costCodes.map((code) {
                              return Padding(
                                padding: EdgeInsets.only(bottom: spacing.sm),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        code['name']!,
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                    ),
                                    SizedBox(width: spacing.md),
                                    Expanded(
                                      child: Container(
                                        height: 1,
                                        color: AppColors.border,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                            SizedBox(height: spacing.md),
                            OutlinedButton.icon(
                              onPressed: () {
                                // TODO: Add cost code
                              },
                              icon: const Icon(Icons.add_circle_outline, size: 16),
                              label: const Text('ADD COST CODE'),
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
                      SizedBox(width: spacing.xxl),
                      Expanded(
                        flex: 3,
                        child: Text(
                          'Cost Codes are labels assigned to costs and revenues as a way of tracking detail on a job.',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            height: 1.5,
                          ),
                        ),
                      ),
                    ],
                  ),

                  SizedBox(height: spacing.xxl),

                  // Cost Types Section
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  'Cost Types',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.success,
                                  ),
                                ),
                                SizedBox(width: spacing.xs),
                                Icon(
                                  Icons.help_outline,
                                  size: 16,
                                  color: AppColors.textSecondary,
                                ),
                              ],
                            ),
                            SizedBox(height: spacing.md),
                            ..._costTypes.map((type) {
                              return Padding(
                                padding: EdgeInsets.only(bottom: spacing.sm),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        type['name']!,
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                    ),
                                    SizedBox(width: spacing.md),
                                    Expanded(
                                      child: DropdownButtonFormField<String>(
                                        value: type['type'],
                                        decoration: InputDecoration(
                                          contentPadding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 8,
                                          ),
                                          border: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                        ),
                                        items: ['both', 'cost', 'revenue'].map((value) {
                                          return DropdownMenuItem(
                                            value: value,
                                            child: Text(value),
                                          );
                                        }).toList(),
                                        onChanged: (value) {
                                          setState(() {
                                            type['type'] = value!;
                                          });
                                        },
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                            SizedBox(height: spacing.md),
                            OutlinedButton.icon(
                              onPressed: () {
                                // TODO: Add cost type
                              },
                              icon: const Icon(Icons.add_circle_outline, size: 16),
                              label: const Text('ADD COST TYPES'),
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
                      SizedBox(width: spacing.xxl),
                      Expanded(
                        flex: 3,
                        child: Text(
                          'Cost Types are high level labels that allow us to view a roll-up of simplified job costing. For example "Materials", "Subcontractor\'s", etc.',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            height: 1.5,
                          ),
                        ),
                      ),
                    ],
                  ),

                  SizedBox(height: spacing.xxl),

                  // Project File Folders Section
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Project File Folders',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            SizedBox(height: spacing.md),
                            ..._projectFileFolders.entries.map((entry) {
                              return Padding(
                                padding: EdgeInsets.only(bottom: spacing.md),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      entry.key,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    SizedBox(height: spacing.xs),
                                    Text(
                                      'ACCESS',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.textSecondary,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    SizedBox(height: spacing.xs),
                                    Wrap(
                                      spacing: spacing.sm,
                                      runSpacing: spacing.sm,
                                      children: entry.value.map((tag) {
                                        return Chip(
                                          label: Text(
                                            tag,
                                            style: const TextStyle(fontSize: 12),
                                          ),
                                          deleteIcon: const Icon(Icons.close, size: 16),
                                          onDeleted: () {
                                            setState(() {
                                              entry.value.remove(tag);
                                            });
                                          },
                                          backgroundColor: AppColors.surfaceLight,
                                        );
                                      }).toList(),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                            SizedBox(height: spacing.md),
                            OutlinedButton.icon(
                              onPressed: () {
                                // TODO: Add project file folder
                              },
                              icon: const Icon(Icons.add_circle_outline, size: 16),
                              label: const Text('ADD PROJECT FILE FOLDER'),
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
                      SizedBox(width: spacing.xxl),
                      Expanded(
                        flex: 3,
                        child: Text(
                          'Project File Folders are file folders that are automatically generated when a project is created. Select who you want to have access to the files inside.',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            height: 1.5,
                          ),
                        ),
                      ),
                    ],
                  ),

                  SizedBox(height: spacing.xxl),

                  // Detailed Job Costing Settings
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Detailed Job Costing Settings',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            SizedBox(height: spacing.md),
                            Row(
                              children: [
                                Text(
                                  'On a Job-by-Job Basis',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                SizedBox(width: spacing.md),
                                Switch(
                                  value: _jobByJobBasis,
                                  onChanged: (value) {
                                    setState(() => _jobByJobBasis = value);
                                  },
                                  activeColor: AppColors.brandPrimary,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      SizedBox(width: spacing.xxl),
                      Expanded(
                        flex: 3,
                        child: Text(
                          'Select whether detailed Job Costing is on by default or selectable on a Job-by-Job basis',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            height: 1.5,
                          ),
                        ),
                      ),
                    ],
                  ),

                  SizedBox(height: spacing.xxl),

                  // Default Accounting Items
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Default Accounting Items',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            SizedBox(height: spacing.md),
                            ..._accountingItems.entries.map((entry) {
                              return Padding(
                                padding: EdgeInsets.only(bottom: spacing.md),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      entry.key,
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.textSecondary,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    SizedBox(height: spacing.xs),
                                    TextFormField(
                                      initialValue: entry.value,
                                      decoration: InputDecoration(
                                        hintText: 'Search product',
                                        prefixIcon: const Icon(Icons.search, size: 20),
                                        contentPadding: const EdgeInsets.symmetric(
                                          horizontal: 12,
                                          vertical: 8,
                                        ),
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                      ),
                                      onChanged: (value) {
                                        setState(() {
                                          _accountingItems[entry.key] = value;
                                        });
                                      },
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ],
                        ),
                      ),
                      SizedBox(width: spacing.xxl),
                      Expanded(
                        flex: 3,
                        child: Text(
                          'Default product items for Project Accounting Settings',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            height: 1.5,
                          ),
                        ),
                      ),
                    ],
                  ),

                  SizedBox(height: spacing.xxl),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
