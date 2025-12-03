import 'package:flutter/material.dart';
import '../../config/constants.dart';
import '../molecules/health_status_box.dart';

class AdminHeaderSection extends StatelessWidget {
  final List<Widget> dbCards;
  final VoidCallback onRefresh;
  const AdminHeaderSection({
    super.key,
    required this.dbCards,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: StyleConstants.headerSectionPadding,
      child: Wrap(
        direction: Axis.horizontal,
        spacing: StyleConstants.cardSpacing,
        runSpacing: StyleConstants.cardRunSpacing,
        crossAxisAlignment: WrapCrossAlignment.start,
        children: [
          HealthStatusBox(onRefresh: onRefresh),
          ...dbCards,
        ],
      ),
    );
  }
}
