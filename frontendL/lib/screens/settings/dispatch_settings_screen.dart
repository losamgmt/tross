/// DispatchSettingsScreen - Scheduling and dispatch configuration
///
/// Features:
/// - Week view start day configuration
/// - Visit creation requirements (skills, certifications)
/// - Smart dispatch algorithm settings
/// - Working hours and travel time configuration
/// - Technician assignment preferences
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../config/app_spacing.dart';
import '../../config/app_colors.dart';
import '../../widgets/organisms/organisms.dart';

class DispatchSettingsScreen extends StatefulWidget {
  const DispatchSettingsScreen({super.key});

  @override
  State<DispatchSettingsScreen> createState() => _DispatchSettingsScreenState();
}

class _DispatchSettingsScreenState extends State<DispatchSettingsScreen> {
  // Week View
  String _weekStartDay = 'Sunday';

  // Visit Creation
  bool _requireSkills = false;
  bool _requireCertifications = false;

  // Smart Dispatch Configuration
  TimeOfDay _workingHoursStart = const TimeOfDay(hour: 7, minute: 0);
  TimeOfDay _workingHoursEnd = const TimeOfDay(hour: 15, minute: 0);
  int _bufferTimeBetweenEvents = 0;
  int _defaultTravelTime = 30;
  String _addTravelTimeToVisit = 'Default travel time (no gaps)';

  // Technician Assignment
  bool _lockTechnicianAssignments = true;
  bool _considerJobContinuity = false;
  bool _considerPropertyFamiliarity = false;
  bool _considerSkillLevels = false;

  Future<void> _selectTime(BuildContext context, bool isStart) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _workingHoursStart : _workingHoursEnd,
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _workingHoursStart = picked;
        } else {
          _workingHoursEnd = picked;
        }
      });
    }
  }

  String _formatTimeOfDay(TimeOfDay time) {
    final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = time.period == DayPeriod.am ? 'AM' : 'PM';
    return '$hour:$minute $period';
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return Scaffold(
      appBar: const AppHeader(pageTitle: 'Dispatch Settings'),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Page header with SAVE button
            Padding(
              padding: spacing.paddingLG,
              child: Row(
                children: [
                  Icon(Icons.route, color: AppColors.success, size: 28),
                  SizedBox(width: spacing.md),
                  Text(
                    'Dispatch Settings',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  ElevatedButton(
                    onPressed: () {
                      // TODO: Save settings
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
            ),

            SizedBox(height: spacing.xl),

            // Week View Section
            Padding(
              padding: spacing.paddingLG,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Week View',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.success,
                    ),
                  ),
                  SizedBox(height: spacing.md),
                  Row(
                    children: [
                      SizedBox(
                        width: 300,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'The week view would start on a',
                              style: TextStyle(
                                fontSize: 14,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            SizedBox(height: spacing.xs),
                            DropdownButtonFormField<String>(
                              value: _weekStartDay,
                              decoration: InputDecoration(
                                labelText: 'REQUIRED',
                                labelStyle: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.textSecondary,
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                              items: [
                                'Sunday',
                                'Monday',
                                'Tuesday',
                                'Wednesday',
                                'Thursday',
                                'Friday',
                                'Saturday',
                              ].map((day) {
                                return DropdownMenuItem(
                                  value: day,
                                  child: Text(day),
                                );
                              }).toList(),
                              onChanged: (value) {
                                setState(() => _weekStartDay = value!);
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            SizedBox(height: spacing.xxl),

            // Visit Creation Section
            Padding(
              padding: spacing.paddingLG,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Visit Creation',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: spacing.md),
                  _buildToggleSetting(
                    'Require Skills to Create Visits',
                    'When enabled, at least one skill must be selected before a visit can be scheduled.',
                    _requireSkills,
                    (value) => setState(() => _requireSkills = value),
                  ),
                  SizedBox(height: spacing.lg),
                  _buildToggleSetting(
                    'Require Certifications to Create Visits',
                    'When enabled, at least one certification must be selected before a visit can be scheduled.',
                    _requireCertifications,
                    (value) => setState(() => _requireCertifications = value),
                  ),
                ],
              ),
            ),

            SizedBox(height: spacing.xxl),

            // Smart Dispatch Configuration Section
            Padding(
              padding: spacing.paddingLG,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Smart Dispatch Configuration',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: spacing.md),

                  // Working Hours
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Working Hours',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            SizedBox(height: spacing.xs),
                            Text(
                              'Defines the start and end time for scheduling visits within a technician\'s normal working hours.',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(width: spacing.xl),
                      // Time pickers
                      Row(
                        children: [
                          InkWell(
                            onTap: () => _selectTime(context, true),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 10,
                              ),
                              decoration: BoxDecoration(
                                border: Border.all(color: AppColors.border),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Row(
                                children: [
                                  Text(
                                    _formatTimeOfDay(_workingHoursStart),
                                    style: const TextStyle(fontSize: 14),
                                  ),
                                  SizedBox(width: spacing.sm),
                                  Icon(
                                    Icons.access_time,
                                    size: 18,
                                    color: AppColors.textSecondary,
                                  ),
                                ],
                              ),
                            ),
                          ),
                          Padding(
                            padding: EdgeInsets.symmetric(horizontal: spacing.sm),
                            child: Text(
                              'to',
                              style: TextStyle(
                                fontSize: 14,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ),
                          InkWell(
                            onTap: () => _selectTime(context, false),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 10,
                              ),
                              decoration: BoxDecoration(
                                border: Border.all(color: AppColors.border),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Row(
                                children: [
                                  Text(
                                    _formatTimeOfDay(_workingHoursEnd),
                                    style: const TextStyle(fontSize: 14),
                                  ),
                                  SizedBox(width: spacing.sm),
                                  Icon(
                                    Icons.access_time,
                                    size: 18,
                                    color: AppColors.textSecondary,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  SizedBox(height: spacing.lg),

                  // Buffer Time Between Events
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Buffer Time Between Events',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            SizedBox(height: spacing.xs),
                            Text(
                              'Sets buffer time between optimized visits.',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(width: spacing.xl),
                      SizedBox(
                        width: 120,
                        child: Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                initialValue: _bufferTimeBetweenEvents.toString(),
                                keyboardType: TextInputType.number,
                                inputFormatters: [
                                  FilteringTextInputFormatter.digitsOnly,
                                ],
                                decoration: InputDecoration(
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 10,
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                ),
                                onChanged: (value) {
                                  setState(() {
                                    _bufferTimeBetweenEvents =
                                        int.tryParse(value) ?? 0;
                                  });
                                },
                              ),
                            ),
                            SizedBox(width: spacing.sm),
                            Text(
                              'min',
                              style: TextStyle(
                                fontSize: 14,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  SizedBox(height: spacing.lg),

                  // Default travel time between events
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Default travel time between events',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            SizedBox(height: spacing.xs),
                            Text(
                              'Default travel time is included in visit duration.',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(width: spacing.xl),
                      SizedBox(
                        width: 120,
                        child: Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                initialValue: _defaultTravelTime.toString(),
                                keyboardType: TextInputType.number,
                                inputFormatters: [
                                  FilteringTextInputFormatter.digitsOnly,
                                ],
                                decoration: InputDecoration(
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 10,
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                ),
                                onChanged: (value) {
                                  setState(() {
                                    _defaultTravelTime = int.tryParse(value) ?? 30;
                                  });
                                },
                              ),
                            ),
                            SizedBox(width: spacing.sm),
                            Text(
                              'min',
                              style: TextStyle(
                                fontSize: 14,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  SizedBox(height: spacing.lg),

                  // Add travel time to visit
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Add travel time to visit',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            SizedBox(height: spacing.xs),
                            Text(
                              'Defines how the travel time is added to the visit. The travel time can be added to the visit, as a gap or not at all.',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(width: spacing.xl),
                      SizedBox(
                        width: 280,
                        child: DropdownButtonFormField<String>(
                          value: _addTravelTimeToVisit,
                          decoration: InputDecoration(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          items: [
                            'Default travel time (no gaps)',
                            'Add travel time to visit',
                            'Do not add travel time',
                          ].map((option) {
                            return DropdownMenuItem(
                              value: option,
                              child: Text(option),
                            );
                          }).toList(),
                          onChanged: (value) {
                            setState(() => _addTravelTimeToVisit = value!);
                          },
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            SizedBox(height: spacing.xxl),

            // Technician Assignment Section
            Padding(
              padding: spacing.paddingLG,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Technician Assignment',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: spacing.md),
                  _buildToggleSetting(
                    'Lock Technician Assignments',
                    'When enabled, Smart Dispatch optimizes the technician\'s schedule without reassigning visits to other technicians.',
                    _lockTechnicianAssignments,
                    (value) => setState(() => _lockTechnicianAssignments = value),
                  ),
                  SizedBox(height: spacing.lg),
                  _buildToggleSetting(
                    'Consider Job Continuity',
                    'When enabled, Smart Dispatch favors assigning follow-ups to the previous technician whenever possible.',
                    _considerJobContinuity,
                    (value) => setState(() => _considerJobContinuity = value),
                  ),
                  SizedBox(height: spacing.lg),
                  _buildToggleSetting(
                    'Consider Property Familiarity',
                    'When enabled, Smart Dispatch favors technicians who have previously worked at the property whenever possible.',
                    _considerPropertyFamiliarity,
                    (value) =>
                        setState(() => _considerPropertyFamiliarity = value),
                  ),
                  SizedBox(height: spacing.lg),
                  _buildToggleSetting(
                    'Consider Skill Levels',
                    'When enabled, Smart Dispatch factors in skill level (1-5) and favors higher-skilled technicians whenever possible.',
                    _considerSkillLevels,
                    (value) => setState(() => _considerSkillLevels = value),
                  ),
                ],
              ),
            ),

            SizedBox(height: spacing.xxl),
          ],
        ),
      ),
    );
  }

  Widget _buildToggleSetting(
    String title,
    String description,
    bool value,
    ValueChanged<bool> onChanged,
  ) {
    final spacing = context.spacing;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
              ),
              SizedBox(height: spacing.xs),
              Text(
                description,
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        SizedBox(width: spacing.md),
        Switch(
          value: value,
          onChanged: onChanged,
          activeColor: AppColors.brandPrimary,
        ),
      ],
    );
  }
}
