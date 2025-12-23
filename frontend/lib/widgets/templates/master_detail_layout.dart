/// MasterDetailLayout - Generic responsive master-detail pattern template
///
/// Provides a two-panel layout with:
/// - Master panel: List of items (entities, records, etc.)
/// - Detail panel: Selected item content
/// - Responsive behavior: side-by-side on wide (>=900px), stacked on narrow
///
/// Uses centralized breakpoints from AppBreakpoints for consistency.
///
/// This is a PURE UI component with no business logic.
/// Works for both admin (entity settings) and business (list/detail) use cases.
///
/// Usage:
/// ```dart
/// MasterDetailLayout<Customer>(
///   masterTitle: 'Customers',
///   items: customers,
///   selectedItem: selectedCustomer,
///   onItemSelected: (customer) => setState(() => selectedCustomer = customer),
///   masterItemBuilder: (customer, isSelected) => ListTile(
///     title: Text(customer.name),
///     selected: isSelected,
///   ),
///   detailBuilder: (customer) => CustomerDetail(customer: customer),
///   emptyMasterMessage: 'No customers found',
///   emptyDetailMessage: 'Select a customer to view details',
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_spacing.dart';

/// Master-detail layout with responsive breakpoints
class MasterDetailLayout<T> extends StatelessWidget {
  /// Title for the master panel
  final String masterTitle;

  /// Optional icon for the master panel header
  final IconData? masterIcon;

  /// List of items to display in master panel
  final List<T> items;

  /// Currently selected item (null if none selected)
  final T? selectedItem;

  /// Callback when an item is selected
  final ValueChanged<T> onItemSelected;

  /// Builder for master list items
  /// Receives the item and whether it's currently selected
  final Widget Function(T item, bool isSelected) masterItemBuilder;

  /// Builder for detail panel content
  /// Receives the selected item
  final Widget Function(T item) detailBuilder;

  /// Message when master list is empty
  final String emptyMasterMessage;

  /// Message when no item is selected
  final String emptyDetailMessage;

  /// Optional header widget for master panel (below title)
  final Widget? masterHeader;

  /// Optional actions for master panel header
  final List<Widget>? masterActions;

  /// Width of master panel on wide screens (defaults to AppBreakpoints.masterPanelWidth)
  final double masterWidth;

  /// Breakpoint for switching between layouts (defaults to AppBreakpoints.masterDetailBreakpoint)
  /// Override only for special cases - prefer using centralized breakpoints
  final double breakpoint;

  /// Whether to show a back button in detail on narrow screens
  final bool showBackButton;

  /// Callback when back button is pressed on narrow screens
  final VoidCallback? onBack;

  const MasterDetailLayout({
    super.key,
    required this.masterTitle,
    this.masterIcon,
    required this.items,
    required this.selectedItem,
    required this.onItemSelected,
    required this.masterItemBuilder,
    required this.detailBuilder,
    this.emptyMasterMessage = 'No items found',
    this.emptyDetailMessage = 'Select an item to view details',
    this.masterHeader,
    this.masterActions,
    this.masterWidth = AppBreakpoints.masterPanelWidth,
    this.breakpoint = AppBreakpoints.masterDetailBreakpoint,
    this.showBackButton = true,
    this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= breakpoint;

        if (isWide) {
          return _buildWideLayout(context);
        } else {
          return _buildNarrowLayout(context);
        }
      },
    );
  }

  /// Wide layout: master and detail side by side
  Widget _buildWideLayout(BuildContext context) {
    return Row(
      children: [
        // Master panel
        SizedBox(width: masterWidth, child: _buildMasterPanel(context)),
        // Divider
        const VerticalDivider(width: 1, thickness: 1),
        // Detail panel
        Expanded(child: _buildDetailPanel(context, showBack: false)),
      ],
    );
  }

  /// Narrow layout: show master or detail based on selection
  Widget _buildNarrowLayout(BuildContext context) {
    if (selectedItem != null) {
      return _buildDetailPanel(context, showBack: showBackButton);
    }
    return _buildMasterPanel(context);
  }

  /// Build the master (list) panel
  Widget _buildMasterPanel(BuildContext context) {
    return Material(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          _MasterHeader(
            title: masterTitle,
            icon: masterIcon,
            actions: masterActions,
          ),
          // Optional header widget
          if (masterHeader != null) masterHeader!,
          // List
          Expanded(
            child: items.isEmpty
                ? _EmptyState(message: emptyMasterMessage)
                : ListView.builder(
                    itemCount: items.length,
                    itemBuilder: (context, index) {
                      final item = items[index];
                      final isSelected = selectedItem == item;
                      return InkWell(
                        onTap: () => onItemSelected(item),
                        child: masterItemBuilder(item, isSelected),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  /// Build the detail panel
  Widget _buildDetailPanel(BuildContext context, {required bool showBack}) {
    if (selectedItem == null) {
      return _EmptyState(message: emptyDetailMessage, icon: Icons.touch_app);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Back button on narrow screens
        if (showBack && onBack != null) _DetailHeader(onBack: onBack!),
        // Detail content
        Expanded(child: detailBuilder(selectedItem as T)),
      ],
    );
  }
}

// ============================================================================
// SUPPORTING WIDGETS
// ============================================================================

/// Header for the master panel
class _MasterHeader extends StatelessWidget {
  final String title;
  final IconData? icon;
  final List<Widget>? actions;

  const _MasterHeader({required this.title, this.icon, this.actions});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        border: Border(
          bottom: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: Row(
        children: [
          if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 8)],
          Expanded(
            child: Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
          ),
          if (actions != null) ...actions!,
        ],
      ),
    );
  }
}

/// Header with back button for detail panel on narrow screens
class _DetailHeader extends StatelessWidget {
  final VoidCallback onBack;

  const _DetailHeader({required this.onBack});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: onBack,
            tooltip: 'Back to list',
          ),
          Text('Back', style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}

/// Empty state placeholder
class _EmptyState extends StatelessWidget {
  final String message;
  final IconData icon;

  const _EmptyState({required this.message, this.icon = Icons.inbox_outlined});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 48, color: AppColors.textSecondary),
          const SizedBox(height: 16),
          Text(
            message,
            style: Theme.of(
              context,
            ).textTheme.bodyLarge?.copyWith(color: AppColors.textSecondary),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// CONVENIENCE BUILDERS
// ============================================================================

/// Build a simple selectable list tile for master panel
class MasterListTile extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;
  final bool isSelected;
  final VoidCallback? onTap;

  const MasterListTile({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.isSelected = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isSelected
            ? Theme.of(context).colorScheme.primaryContainer
            : null,
        border: Border(
          left: BorderSide(
            color: isSelected
                ? Theme.of(context).colorScheme.primary
                : Colors.transparent,
            width: 3,
          ),
        ),
      ),
      child: ListTile(
        leading: icon != null
            ? Icon(
                icon,
                color: isSelected
                    ? Theme.of(context).colorScheme.primary
                    : null,
              )
            : null,
        title: Text(
          title,
          style: TextStyle(
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        subtitle: subtitle != null ? Text(subtitle!) : null,
        onTap: onTap,
      ),
    );
  }
}
