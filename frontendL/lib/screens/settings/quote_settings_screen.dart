/// QuoteSettingsScreen - Quote and proposal template management
///
/// Features:
/// - Template list management
/// - Rich text template editor
/// - Merge field support for dynamic data
/// - Company default designation
/// - Template/Preferences tabs
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../../config/app_colors.dart';
import '../../widgets/organisms/organisms.dart';

class QuoteSettingsScreen extends StatefulWidget {
  const QuoteSettingsScreen({super.key});

  @override
  State<QuoteSettingsScreen> createState() => _QuoteSettingsScreenState();
}

class _QuoteSettingsScreenState extends State<QuoteSettingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String? _selectedTemplateId;

  // Sample quote templates
  final List<Map<String, dynamic>> _templates = [
    {
      'id': '1',
      'name': 'Tross Build Quote Template',
      'description': 'Standard template for build projects',
      'isDefault': false,
    },
    {
      'id': '2',
      'name': 'Tross Quote Template',
      'description': 'General quote template for all services',
      'isDefault': true,
    },
  ];

  // Template editor state
  final TextEditingController _templateNameController = TextEditingController();
  final TextEditingController _templateDescriptionController =
      TextEditingController();
  final TextEditingController _templateContentController =
      TextEditingController();
  bool _assignedTo = false;
  bool _isCompanyDefault = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);

    // Select first template by default
    if (_templates.isNotEmpty) {
      _selectedTemplateId = _templates[0]['id'];
      _loadTemplate(_templates[0]);
    }
  }

  void _loadTemplate(Map<String, dynamic> template) {
    setState(() {
      _templateNameController.text = template['name'];
      _templateDescriptionController.text = template['description'];
      _isCompanyDefault = template['isDefault'];

      // Sample template content with merge fields
      _templateContentController.text = '''[[DepartmentCompanyName] / [DepartmentCompanyLogo]]
[[DocHeadSubject]]

Customer Information
Name: [[ContactOffice]]
Billing Contact: [[PrimaryBillingContactName]]
Billing Address: [[PrimaryBillingContactAddress]]
Phone: [[DepartmentPhone]]
Email: [[DueDate/Email]]

                                          Tross LLC
Date: [[DueDate/Date]]
Email: [owner@trossmaintenance.com]
Invoice #: [[Invoice]]
Address: [[DepartmentCompanyAddress]]
Phone: [[DepartmentCompanyPhone]]

As requested, we are pleased to offer our proposal for the above referenced project as follows:

Scope of Work
[[Section#.Title]]
[[Section#.]]

Site Access
Before we can begin work, site access (including keys or key fob) is required. If it is required, Customer must inform Tross prior to accepting this bid.

Work and projects that are approved by the customer, or it's representative, for maintenance repair, project or preventative maintenance services outside of the scope of work listed above will be billed at an hourly rate per the Tross hourly fee schedule. Any unforeseen conditions will be billed on a time and material basis if not covered under the maintenance contract.

QUALIFICATIONS
1. Our offer is firm for 30 days from the date listed above.
2. Upon acceptance, we will keep upon a clear and accessible area that will be made available by others, where our work is to be performed.
3. Unless noted in the specific inclusions, our work will be performed during our normal working hours which are M-F 8:00-5:00pm.

Total Proposal as Outlined Above.................. [[Total]]


ACCEPTANCE OF PROPOSAL
This proposal represents the entire agreement between the parties. There are no representations, understandings, or agreements unless expressly included herein.

LIMITATION ON LIABILITY AND DAMAGES: We assume no liability for the cost of repair or replacement of unprotected defects, either current or arising in the future. In all cases, our liability is limited to the scope of work and charges for that work and under no circumstances will we be responsible for consequential, exemplary, special or incidental damages or for the loss of the use of the items/building. You acknowledge that this liquidated damages is not a penalty, but that we are not intending to limit liability for personal injury or death to persons, caused by our negligence. Without such damages provision, we are willing to perform the work requested for an increased fee, payable in advance.''';
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _templateNameController.dispose();
    _templateDescriptionController.dispose();
    _templateContentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return Scaffold(
      appBar: const AppHeader(pageTitle: 'Quote Settings'),
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
                  'Quote Settings',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
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
                Tab(text: 'Template'),
                Tab(text: 'Preferences'),
              ],
            ),
          ),

          // Tab content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildTemplateTab(),
                _buildPreferencesTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTemplateTab() {
    final spacing = context.spacing;

    return Row(
      children: [
        // Left sidebar - Template list
        Container(
          width: 250,
          decoration: BoxDecoration(
            color: AppColors.surfaceLight.withOpacity(0.3),
            border: Border(
              right: BorderSide(color: AppColors.border),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Templates header
              Padding(
                padding: spacing.paddingMD,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Templates',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: spacing.md),
                    OutlinedButton.icon(
                      onPressed: () {
                        // TODO: Add template
                      },
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('ADD TEMPLATE'),
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

              Divider(height: 1, color: AppColors.border),

              // Template list
              Expanded(
                child: ListView.builder(
                  itemCount: _templates.length,
                  itemBuilder: (context, index) {
                    final template = _templates[index];
                    final isSelected = template['id'] == _selectedTemplateId;

                    return InkWell(
                      onTap: () {
                        setState(() {
                          _selectedTemplateId = template['id'];
                          _loadTemplate(template);
                        });
                      },
                      child: Container(
                        padding: spacing.paddingMD,
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppColors.success.withOpacity(0.1)
                              : Colors.transparent,
                          border: Border(
                            left: BorderSide(
                              color: isSelected
                                  ? AppColors.success
                                  : Colors.transparent,
                              width: 3,
                            ),
                          ),
                        ),
                        child: Row(
                          children: [
                            if (template['isDefault'])
                              Padding(
                                padding: EdgeInsets.only(right: spacing.xs),
                                child: Icon(
                                  Icons.star,
                                  size: 16,
                                  color: AppColors.warning,
                                ),
                              ),
                            Expanded(
                              child: Text(
                                template['name'],
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight:
                                      isSelected ? FontWeight.w600 : FontWeight.normal,
                                  color: isSelected
                                      ? AppColors.success
                                      : AppColors.textPrimary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),

        // Right side - Template editor
        Expanded(
          child: _buildTemplateEditor(),
        ),
      ],
    );
  }

  Widget _buildTemplateEditor() {
    final spacing = context.spacing;

    return SingleChildScrollView(
      padding: spacing.paddingLG,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Template name and actions
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _templateNameController,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    hintText: 'Template Name',
                  ),
                ),
              ),
              SizedBox(width: spacing.md),
              Row(
                children: [
                  Icon(Icons.business, size: 18, color: AppColors.textSecondary),
                  SizedBox(width: spacing.xs),
                  Text(
                    'Company Default',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  SizedBox(width: spacing.xs),
                  Switch(
                    value: _isCompanyDefault,
                    onChanged: (value) {
                      setState(() => _isCompanyDefault = value);
                    },
                    activeColor: AppColors.success,
                  ),
                ],
              ),
              SizedBox(width: spacing.md),
              ElevatedButton(
                onPressed: () {
                  // TODO: Save template
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

          SizedBox(height: spacing.md),

          // Description
          TextFormField(
            controller: _templateDescriptionController,
            decoration: InputDecoration(
              hintText: 'Enter a description for the Quote Template',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(4),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 8,
              ),
            ),
          ),

          SizedBox(height: spacing.md),

          // Assigned to toggle
          Row(
            children: [
              Text(
                'Assigned to',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textPrimary,
                ),
              ),
              SizedBox(width: spacing.sm),
              Switch(
                value: _assignedTo,
                onChanged: (value) {
                  setState(() => _assignedTo = value);
                },
                activeColor: AppColors.brandPrimary,
              ),
            ],
          ),

          SizedBox(height: spacing.md),

          // Rich text editor toolbar
          Container(
            padding: EdgeInsets.all(spacing.sm),
            decoration: BoxDecoration(
              color: AppColors.surfaceLight,
              border: Border.all(color: AppColors.border),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(4),
                topRight: Radius.circular(4),
              ),
            ),
            child: Wrap(
              spacing: spacing.xs,
              runSpacing: spacing.xs,
              children: [
                // Font selector
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: DropdownButton<String>(
                    value: 'Paragraph',
                    items: ['Paragraph', 'Heading 1', 'Heading 2', 'Heading 3']
                        .map((style) {
                      return DropdownMenuItem(
                        value: style,
                        child: Text(style, style: const TextStyle(fontSize: 13)),
                      );
                    }).toList(),
                    onChanged: (value) {},
                    underline: const SizedBox(),
                    isDense: true,
                  ),
                ),
                _buildToolbarButton(Icons.format_bold, 'Bold'),
                _buildToolbarButton(Icons.format_italic, 'Italic'),
                _buildToolbarButton(Icons.format_underlined, 'Underline'),
                _buildToolbarButton(Icons.format_strikethrough, 'Strikethrough'),
                VerticalDivider(width: 1, color: AppColors.border),
                _buildToolbarButton(Icons.format_align_left, 'Align left'),
                _buildToolbarButton(Icons.format_align_center, 'Align center'),
                _buildToolbarButton(Icons.format_align_right, 'Align right'),
                _buildToolbarButton(Icons.format_align_justify, 'Align justify'),
                VerticalDivider(width: 1, color: AppColors.border),
                _buildToolbarButton(Icons.format_list_bulleted, 'Bullet list'),
                _buildToolbarButton(Icons.format_list_numbered, 'Numbered list'),
                VerticalDivider(width: 1, color: AppColors.border),
                _buildToolbarButton(Icons.link, 'Insert link'),
                _buildToolbarButton(Icons.image, 'Insert image'),
                _buildToolbarButton(Icons.table_chart, 'Insert table'),
                _buildToolbarButton(Icons.code, 'Code'),
              ],
            ),
          ),

          // Template content editor
          Container(
            constraints: const BoxConstraints(minHeight: 600),
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border),
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(4),
                bottomRight: Radius.circular(4),
              ),
            ),
            child: TextFormField(
              controller: _templateContentController,
              maxLines: null,
              style: const TextStyle(
                fontSize: 13,
                fontFamily: 'monospace',
                height: 1.5,
              ),
              decoration: InputDecoration(
                border: InputBorder.none,
                contentPadding: spacing.paddingMD,
                hintText: 'Enter template content...\n\nUse merge fields like [[FieldName]] for dynamic data.',
              ),
            ),
          ),

          SizedBox(height: spacing.md),

          // Merge fields help
          Container(
            padding: spacing.paddingMD,
            decoration: BoxDecoration(
              color: AppColors.brandPrimary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: AppColors.brandPrimary.withOpacity(0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.info_outline, size: 18, color: AppColors.brandPrimary),
                    SizedBox(width: spacing.sm),
                    Text(
                      'Available Merge Fields',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.brandPrimary,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: spacing.sm),
                Text(
                  'Use double brackets to insert merge fields: [[FieldName]]\n\n'
                  'Common fields: [[DepartmentCompanyName]], [[ContactOffice]], [[DueDate]], '
                  '[[Invoice]], [[Total]], [[Section#.Title]], [[PrimaryBillingContactName]]',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToolbarButton(IconData icon, String tooltip) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: () {
          // TODO: Implement formatting
        },
        child: Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.border),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Icon(icon, size: 16, color: AppColors.textSecondary),
        ),
      ),
    );
  }

  Widget _buildPreferencesTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.settings, size: 64, color: AppColors.textSecondary),
          const SizedBox(height: 16),
          Text(
            'Quote Preferences Coming Soon',
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
