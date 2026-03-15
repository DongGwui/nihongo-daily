'use client';

import { ActivityCalendar } from 'react-activity-calendar';
import { Tooltip as ReactTooltip } from 'react-tooltip';

interface CalendarDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface CalendarHeatmapProps {
  data: CalendarDay[];
}

const theme = {
  dark: ['#1f2937', '#065f46', '#059669', '#10b981', '#34d399'] as [string, string, string, string, string],
};

export function CalendarHeatmap({ data }: CalendarHeatmapProps) {
  const calendarData = data.length > 0 ? data : [{ date: new Date().toISOString().split('T')[0], count: 0, level: 0 as const }];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">학습 캘린더</h2>
      <div className="overflow-x-auto">
        <ActivityCalendar
          data={calendarData}
          theme={theme}
          colorScheme="dark"
          blockSize={14}
          blockMargin={4}
          fontSize={14}
          renderBlock={(block: React.ReactElement, activity: { date: string; count: number }) => (
            <g data-tooltip-id="calendar-tooltip" data-tooltip-content={`${activity.date}: ${activity.count}문제`}>
              {block}
            </g>
          )}
        />
        <ReactTooltip id="calendar-tooltip" />
      </div>
    </div>
  );
}
