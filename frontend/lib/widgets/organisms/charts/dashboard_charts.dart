/// Dashboard Charts Widget
///
/// Reusable chart components for the dashboard using fl_chart.
/// Follows atomic design - these are organisms that compose molecules/atoms.
library;

import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

/// A pie chart showing distribution of items
class DistributionPieChart extends StatelessWidget {
  final String title;
  final List<PieChartItem> items;
  final double? centerSpaceRadius;
  final double? radius;

  const DistributionPieChart({
    super.key,
    required this.title,
    required this.items,
    this.centerSpaceRadius,
    this.radius,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = items.fold<double>(0, (sum, item) => sum + item.value);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: theme.textTheme.titleMedium),
        const SizedBox(height: 16),
        SizedBox(
          height: 200,
          child: Row(
            children: [
              Expanded(
                child: PieChart(
                  PieChartData(
                    centerSpaceRadius: centerSpaceRadius ?? 40,
                    sectionsSpace: 2,
                    sections: items.map((item) {
                      final percentage = total > 0
                          ? (item.value / total * 100)
                          : 0;
                      return PieChartSectionData(
                        value: item.value,
                        title: '${percentage.toStringAsFixed(0)}%',
                        color: item.color,
                        radius: radius ?? 50,
                        titleStyle: theme.textTheme.labelSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: items.map((item) => _LegendItem(item: item)).toList(),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// A bar chart for comparing values
class ComparisonBarChart extends StatelessWidget {
  final String title;
  final List<BarChartItem> items;
  final double? barWidth;
  final bool showValues;

  const ComparisonBarChart({
    super.key,
    required this.title,
    required this.items,
    this.barWidth,
    this.showValues = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final maxValue = items.fold<double>(
      0,
      (max, item) => item.value > max ? item.value : max,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: theme.textTheme.titleMedium),
        const SizedBox(height: 16),
        SizedBox(
          height: 200,
          child: BarChart(
            BarChartData(
              alignment: BarChartAlignment.spaceAround,
              maxY: maxValue * 1.2,
              minY: 0,
              barTouchData: BarTouchData(
                enabled: true,
                touchTooltipData: BarTouchTooltipData(
                  getTooltipItem: (group, groupIndex, rod, rodIndex) {
                    return BarTooltipItem(
                      '${items[groupIndex].label}\n${rod.toY.toStringAsFixed(0)}',
                      theme.textTheme.labelSmall!,
                    );
                  },
                ),
              ),
              titlesData: FlTitlesData(
                show: true,
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    getTitlesWidget: (value, meta) {
                      final index = value.toInt();
                      if (index >= 0 && index < items.length) {
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            items[index].label,
                            style: theme.textTheme.labelSmall,
                          ),
                        );
                      }
                      return const SizedBox.shrink();
                    },
                    reservedSize: 30,
                  ),
                ),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 40,
                    getTitlesWidget: (value, meta) {
                      return Text(
                        value.toInt().toString(),
                        style: theme.textTheme.labelSmall,
                      );
                    },
                  ),
                ),
                topTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                rightTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
              ),
              gridData: FlGridData(
                show: true,
                drawVerticalLine: false,
                horizontalInterval: maxValue / 5,
                getDrawingHorizontalLine: (value) =>
                    FlLine(color: theme.dividerColor, strokeWidth: 1),
              ),
              borderData: FlBorderData(show: false),
              barGroups: items.asMap().entries.map((entry) {
                return BarChartGroupData(
                  x: entry.key,
                  barRods: [
                    BarChartRodData(
                      toY: entry.value.value,
                      color: entry.value.color ?? theme.colorScheme.primary,
                      width: barWidth ?? 20,
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(4),
                      ),
                    ),
                  ],
                );
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }
}

/// A line chart for trends over time
class TrendLineChart extends StatelessWidget {
  final String title;
  final List<LineChartSeries> series;
  final List<String>? xLabels;
  final bool showDots;
  final bool curved;

  const TrendLineChart({
    super.key,
    required this.title,
    required this.series,
    this.xLabels,
    this.showDots = true,
    this.curved = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    double maxY = 0;
    for (final s in series) {
      for (final point in s.data) {
        if (point.y > maxY) maxY = point.y;
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: theme.textTheme.titleMedium),
        const SizedBox(height: 16),
        SizedBox(
          height: 200,
          child: LineChart(
            LineChartData(
              minY: 0,
              maxY: maxY * 1.2,
              lineTouchData: LineTouchData(
                enabled: true,
                touchTooltipData: LineTouchTooltipData(
                  getTooltipItems: (touchedSpots) {
                    return touchedSpots.map((spot) {
                      final seriesItem = series[spot.barIndex];
                      return LineTooltipItem(
                        '${seriesItem.label}: ${spot.y.toStringAsFixed(0)}',
                        theme.textTheme.labelSmall!.copyWith(
                          color: seriesItem.color,
                        ),
                      );
                    }).toList();
                  },
                ),
              ),
              titlesData: FlTitlesData(
                show: true,
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: xLabels != null,
                    getTitlesWidget: (value, meta) {
                      final index = value.toInt();
                      if (xLabels != null &&
                          index >= 0 &&
                          index < xLabels!.length) {
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            xLabels![index],
                            style: theme.textTheme.labelSmall,
                          ),
                        );
                      }
                      return const SizedBox.shrink();
                    },
                    reservedSize: 30,
                  ),
                ),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 40,
                    getTitlesWidget: (value, meta) {
                      return Text(
                        value.toInt().toString(),
                        style: theme.textTheme.labelSmall,
                      );
                    },
                  ),
                ),
                topTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                rightTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
              ),
              gridData: FlGridData(
                show: true,
                drawVerticalLine: false,
                horizontalInterval: maxY / 5,
                getDrawingHorizontalLine: (value) =>
                    FlLine(color: theme.dividerColor, strokeWidth: 1),
              ),
              borderData: FlBorderData(show: false),
              lineBarsData: series.map((s) {
                return LineChartBarData(
                  spots: s.data,
                  isCurved: curved,
                  color: s.color,
                  barWidth: 3,
                  dotData: FlDotData(show: showDots),
                  belowBarData: BarAreaData(
                    show: true,
                    color: s.color.withValues(alpha: 0.1),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
        if (series.length > 1) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 16,
            children: series
                .map(
                  (s) => _LegendItem(
                    item: PieChartItem(
                      label: s.label,
                      value: 0,
                      color: s.color,
                    ),
                  ),
                )
                .toList(),
          ),
        ],
      ],
    );
  }
}

// StatCard moved to molecules/cards/stat_card.dart
// Use StatCard.dashboard() for dashboard-style cards with trends

// ══════════════════════════════════════════════════════════════════════════════
// DATA MODELS
// ══════════════════════════════════════════════════════════════════════════════

/// Data item for pie charts
class PieChartItem {
  final String label;
  final double value;
  final Color color;

  const PieChartItem({
    required this.label,
    required this.value,
    required this.color,
  });
}

/// Data item for bar charts
class BarChartItem {
  final String label;
  final double value;
  final Color? color;

  const BarChartItem({required this.label, required this.value, this.color});
}

/// Series data for line charts
class LineChartSeries {
  final String label;
  final List<FlSpot> data;
  final Color color;

  const LineChartSeries({
    required this.label,
    required this.data,
    required this.color,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PRIVATE WIDGETS
// ══════════════════════════════════════════════════════════════════════════════

class _LegendItem extends StatelessWidget {
  final PieChartItem item;

  const _LegendItem({required this.item});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: item.color,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const SizedBox(width: 8),
          Text(item.label, style: theme.textTheme.labelMedium),
        ],
      ),
    );
  }
}
