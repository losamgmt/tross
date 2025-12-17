/// Dashboard Charts Tests
///
/// Tests for fl_chart-based chart components
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:tross_app/widgets/organisms/charts/dashboard_charts.dart';
import 'package:tross_app/widgets/molecules/cards/stat_card.dart';

void main() {
  group('StatCard', () {
    testWidgets('renders with required props', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard.dashboard(
              label: 'Users',
              value: '100',
              icon: Icons.people,
            ),
          ),
        ),
      );

      expect(find.text('Users'), findsOneWidget);
      expect(find.text('100'), findsOneWidget);
      expect(find.byIcon(Icons.people), findsOneWidget);
    });

    testWidgets('shows trend indicator when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard.dashboard(
              label: 'Sales',
              value: '500',
              icon: Icons.attach_money,
              trend: '+15%',
              trendUp: true,
            ),
          ),
        ),
      );

      expect(find.text('+15%'), findsOneWidget);
      expect(find.byIcon(Icons.trending_up), findsOneWidget);
    });

    testWidgets('shows downward trend correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard.dashboard(
              label: 'Errors',
              value: '12',
              icon: Icons.error,
              trend: '-8%',
              trendUp: false,
            ),
          ),
        ),
      );

      expect(find.text('-8%'), findsOneWidget);
      expect(find.byIcon(Icons.trending_down), findsOneWidget);
    });

    testWidgets('uses custom color', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard.dashboard(
              label: 'Custom',
              value: '42',
              icon: Icons.star,
              color: Colors.purple,
            ),
          ),
        ),
      );

      // Icon should use the custom color
      final icon = tester.widget<Icon>(find.byIcon(Icons.star));
      expect(icon.color, Colors.purple);
    });
  });

  group('DistributionPieChart', () {
    testWidgets('renders title and legend', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DistributionPieChart(
              title: 'Distribution',
              items: [
                PieChartItem(label: 'A', value: 50, color: Colors.blue),
                PieChartItem(label: 'B', value: 30, color: Colors.red),
                PieChartItem(label: 'C', value: 20, color: Colors.green),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Distribution'), findsOneWidget);
      expect(find.text('A'), findsOneWidget);
      expect(find.text('B'), findsOneWidget);
      expect(find.text('C'), findsOneWidget);
    });

    testWidgets('renders pie chart widget', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DistributionPieChart(
              title: 'Test',
              items: [PieChartItem(label: 'X', value: 100, color: Colors.blue)],
            ),
          ),
        ),
      );

      expect(find.byType(PieChart), findsOneWidget);
    });
  });

  group('ComparisonBarChart', () {
    testWidgets('renders title and labels', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ComparisonBarChart(
              title: 'Comparison',
              items: [
                BarChartItem(label: 'Jan', value: 100),
                BarChartItem(label: 'Feb', value: 150),
                BarChartItem(label: 'Mar', value: 120),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Comparison'), findsOneWidget);
      expect(find.byType(BarChart), findsOneWidget);
    });
  });

  group('TrendLineChart', () {
    testWidgets('renders title and chart', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TrendLineChart(
              title: 'Trends',
              series: [
                LineChartSeries(
                  label: 'Series 1',
                  color: Colors.blue,
                  data: [FlSpot(0, 10), FlSpot(1, 20), FlSpot(2, 15)],
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Trends'), findsOneWidget);
      expect(find.byType(LineChart), findsOneWidget);
    });

    testWidgets('shows legend for multiple series', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TrendLineChart(
              title: 'Multi-Series',
              series: [
                LineChartSeries(
                  label: 'This Week',
                  color: Colors.blue,
                  data: [FlSpot(0, 10)],
                ),
                LineChartSeries(
                  label: 'Last Week',
                  color: Colors.grey,
                  data: [FlSpot(0, 8)],
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text('This Week'), findsOneWidget);
      expect(find.text('Last Week'), findsOneWidget);
    });
  });

  group('Data Models', () {
    test('PieChartItem holds correct values', () {
      const item = PieChartItem(label: 'Test', value: 42.5, color: Colors.red);

      expect(item.label, 'Test');
      expect(item.value, 42.5);
      expect(item.color, Colors.red);
    });

    test('BarChartItem works with optional color', () {
      const itemWithColor = BarChartItem(
        label: 'A',
        value: 100,
        color: Colors.blue,
      );
      const itemWithoutColor = BarChartItem(label: 'B', value: 50);

      expect(itemWithColor.color, Colors.blue);
      expect(itemWithoutColor.color, isNull);
    });

    test('LineChartSeries holds FlSpot data', () {
      const series = LineChartSeries(
        label: 'Test Series',
        color: Colors.green,
        data: [FlSpot(0, 10), FlSpot(1, 20), FlSpot(2, 30)],
      );

      expect(series.label, 'Test Series');
      expect(series.data.length, 3);
      expect(series.data[1].x, 1);
      expect(series.data[1].y, 20);
    });
  });
}
