import { ServiceAreaPicker } from './ServiceAreaPicker';

export function ScheduleAreaFilter({ selectedAreas, onChange }) {
  return (
    <div className="area-filter">
      <div className="area-filter__header">
        <span className="field-label">區域篩選</span>
      </div>
      <ServiceAreaPicker
        mode="multiple"
        selectedValues={selectedAreas}
        onChange={onChange}
        gridClassName="availability-area-grid area-filter__grid"
      />
    </div>
  );
}
