export function LanguageSelector({
  value,
  onChange,
  disabled = false,
  legend = 'Subtitles',
}) {
  return (
    <fieldset className="toolbar-group">
      <legend>{legend}</legend>
      <div className="button-row">
        <button
          type="button"
          className={value === 'en' ? 'btn active' : 'btn'}
          onClick={() => onChange('en')}
          disabled={disabled}
        >
          English
        </button>
        <button
          type="button"
          className={value === 'fr' ? 'btn active' : 'btn'}
          onClick={() => onChange('fr')}
          disabled={disabled}
        >
          French
        </button>
        <button
          type="button"
          className={value === 'off' ? 'btn active' : 'btn'}
          onClick={() => onChange('off')}
        >
          Off
        </button>
      </div>
    </fieldset>
  );
}
