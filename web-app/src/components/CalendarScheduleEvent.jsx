import {
  buildScheduleCardLine,
  formatScheduleDisplayTimeRange,
} from '../utils/scheduleCalendar';
import { ScheduleTechnicianBadge } from './ScheduleTechnicianBadge';

function eventDensityClass(event) {
  const start = event?.start instanceof Date ? event.start.getTime() : 0;
  const end = event?.end instanceof Date ? event.end.getTime() : 0;
  const minutes = (end - start) / 60000;

  if (minutes > 0 && minutes < 50) {
    return 'calendar-event-detail--tiny';
  }

  if (minutes < 110) {
    return 'calendar-event-detail--short';
  }

  return '';
}

export function CalendarScheduleEvent({ event, view, hidePrice = false, relatedSchedules = [] }) {
  const schedule = event.resource;
  const compact = view === 'month';
  const densityClass = eventDensityClass(event);

  if (schedule?.type === 'leave') {
    if (compact) {
      return (
        <div className="calendar-event-content calendar-event-content--compact">
          <ScheduleTechnicianBadge user={schedule.user} size="xs" showName={false} />
          <span className="calendar-event-content__title">休假</span>
        </div>
      );
    }

    return (
      <div className={`calendar-event-detail calendar-event-detail--leave ${densityClass}`.trim()}>
        <ScheduleTechnicianBadge
          user={schedule.user}
          size="xs"
          showName
          className="calendar-event-detail__technician"
        />
        <p className="calendar-event-detail__line">休假</p>
        <p className="calendar-event-detail__time">{formatScheduleDisplayTimeRange(schedule)}</p>
      </div>
    );
  }

  if (compact || !schedule) {
    return (
      <div className="calendar-event-content calendar-event-content--compact">
        {schedule && (
          <ScheduleTechnicianBadge user={schedule.user} size="xs" showName={false} />
        )}
        <span className="calendar-event-content__title">{event.title}</span>
      </div>
    );
  }

  return (
    <div className={`calendar-event-detail ${densityClass}`.trim()} data-schedule-id={schedule.id} title={buildScheduleCardLine(schedule, { hidePrice, relatedSchedules })}>
      <ScheduleTechnicianBadge
        user={schedule.user}
        size="xs"
        showName
        className="calendar-event-detail__technician"
      />
      <p className="calendar-event-detail__line">{buildScheduleCardLine(schedule, { hidePrice, relatedSchedules })}</p>
      <p className="calendar-event-detail__time">{formatScheduleDisplayTimeRange(schedule)}</p>
    </div>
  );
}
