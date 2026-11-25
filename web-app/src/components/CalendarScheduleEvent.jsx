import { formatScheduleDisplayTimeRange } from '../utils/scheduleCalendar';
import { EmployeeAvatar } from './EmployeeAvatar';

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

function technicianName(user) {
  return user?.name || user?.account || '未指定師傅';
}

export function CalendarScheduleEvent({ event, view }) {
  const schedule = event.resource;
  const compact = view === 'month';
  const densityClass = eventDensityClass(event);
  const user = schedule?.user;
  const name = technicianName(user);

  if (schedule?.type === 'leave') {
    if (compact) {
      return (
        <div className="calendar-event-content calendar-event-content--compact">
          <EmployeeAvatar user={user} size="xs" />
          <span className="calendar-event-content__title">休假</span>
        </div>
      );
    }

    return (
      <div className={`calendar-event-detail calendar-event-detail--leave ${densityClass}`.trim()}>
        <EmployeeAvatar user={user} size="xs" className="calendar-event-detail__avatar" />
        <div className="calendar-event-detail__body">
          <p className="calendar-event-detail__name">{name}</p>
          <p className="calendar-event-detail__line">休假</p>
          <p className="calendar-event-detail__time">{formatScheduleDisplayTimeRange(schedule)}</p>
        </div>
      </div>
    );
  }

  if (compact || !schedule) {
    return (
      <div className="calendar-event-content calendar-event-content--compact">
        {schedule ? <EmployeeAvatar user={user} size="xs" /> : null}
        <span className="calendar-event-content__title">{event.title}</span>
      </div>
    );
  }

  return (
    <div className={`calendar-event-detail ${densityClass}`.trim()} data-schedule-id={schedule.id} title={event.title}>
      <EmployeeAvatar user={user} size="xs" className="calendar-event-detail__avatar" />
      <div className="calendar-event-detail__body">
        <p className="calendar-event-detail__name">{name}</p>
        <p className="calendar-event-detail__line">{event.title}</p>
        <p className="calendar-event-detail__time">{formatScheduleDisplayTimeRange(schedule)}</p>
      </div>
    </div>
  );
}
