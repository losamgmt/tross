// Service Status Widget - Shows system health in UI
// KISS principle: Simple visual indicator, non-intrusive

import 'package:flutter/material.dart';
import '../../services/service_health_manager.dart';

class ServiceStatusWidget extends StatefulWidget {
  final bool showDetails;

  const ServiceStatusWidget({super.key, this.showDetails = false});

  @override
  State<ServiceStatusWidget> createState() => _ServiceStatusWidgetState();
}

class _ServiceStatusWidgetState extends State<ServiceStatusWidget> {
  final ServiceHealthManager _healthManager = ServiceHealthManager();

  @override
  void initState() {
    super.initState();
    _checkHealth();
  }

  Future<void> _checkHealth() async {
    await _healthManager.checkBackendHealth();
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = _healthManager.backendStatus;
    final message = _healthManager.getStatusMessage();

    return Card(
      margin: const EdgeInsets.all(8.0),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                _getStatusIcon(status),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    message,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
                if (widget.showDetails)
                  IconButton(
                    icon: const Icon(Icons.info_outline),
                    onPressed: () => _showDiagnostics(context),
                  ),
              ],
            ),
            if (status == ServiceStatus.offline)
              Padding(
                padding: const EdgeInsets.only(top: 8.0),
                child: Text(
                  '📱 App running in offline mode',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _getStatusIcon(ServiceStatus status) {
    switch (status) {
      case ServiceStatus.healthy:
        return const Icon(Icons.check_circle, color: Colors.green, size: 20);
      case ServiceStatus.degraded:
        return const Icon(Icons.warning, color: Colors.orange, size: 20);
      case ServiceStatus.critical:
        return const Icon(Icons.error, color: Colors.red, size: 20);
      case ServiceStatus.unknown:
        return const Icon(Icons.help, color: Colors.grey, size: 20);
      case ServiceStatus.offline:
        return const Icon(Icons.cloud_off, color: Colors.grey, size: 20);
    }
  }

  void _showDiagnostics(BuildContext context) {
    final diagnostics = _healthManager.getDiagnostics();
    final theme = Theme.of(context);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('System Diagnostics'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDiagnosticRow(
                'Backend Status',
                diagnostics['backend_status'],
                theme,
              ),
              _buildDiagnosticRow(
                'Backend URL',
                diagnostics['backend_url'],
                theme,
              ),
              _buildDiagnosticRow(
                'Last Check',
                diagnostics['last_check'],
                theme,
              ),
              _buildDiagnosticRow(
                'Frontend Mode',
                diagnostics['frontend_mode'],
                theme,
              ),
              const SizedBox(height: 16),
              Text(
                'Troubleshooting:',
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              ...((diagnostics['troubleshooting'] as List<String>).map(
                (tip) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text('• $tip', style: theme.textTheme.bodySmall),
                ),
              )),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _checkHealth();
            },
            child: const Text('Refresh'),
          ),
        ],
      ),
    );
  }

  Widget _buildDiagnosticRow(String label, String value, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: theme.textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(child: Text(value, style: theme.textTheme.bodySmall)),
        ],
      ),
    );
  }
}
