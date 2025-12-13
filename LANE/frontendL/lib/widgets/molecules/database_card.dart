import 'package:flutter/material.dart';
import '../../config/constants.dart';

class DatabaseCard extends StatelessWidget {
  final String dbName;
  final Widget? child;
  const DatabaseCard({super.key, required this.dbName, this.child});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: StyleConstants.dbCardMargin,
      shape: RoundedRectangleBorder(
        borderRadius: StyleConstants.cardBorderRadius,
      ),
      color: StyleConstants.dbCardColor,
      child: Padding(
        padding: StyleConstants.dbCardPadding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(dbName, style: StyleConstants.dbCardTitleStyle),
            if (child != null) ...[
              SizedBox(height: StyleConstants.dbCardSpacing),
              child!,
            ],
          ],
        ),
      ),
    );
  }
}
