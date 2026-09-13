import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  runApp(const ProviderScope(child: EasyMeterApp()));
}

/// Placeholder root widget for Phase 1 scaffolding.
/// Replaced by lib/app.dart's MaterialApp.router + go_router config
/// once feature implementation begins.
class EasyMeterApp extends StatelessWidget {
  const EasyMeterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EasyMeter',
      home: Scaffold(
        body: Center(
          child: Text(
            'EasyMeter mobile — scaffold ready.\nFeature implementation pending approval.',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
