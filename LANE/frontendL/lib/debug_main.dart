import 'package:flutter/material.dart';

void main() {
  runApp(const SimpleTestApp());
}

class SimpleTestApp extends StatelessWidget {
  const SimpleTestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Debug Test',
      home: Scaffold(
        appBar: AppBar(title: const Text('Debug Test')),
        body: const Center(
          child: Text('Hello World - Simple test without providers'),
        ),
      ),
    );
  }
}
