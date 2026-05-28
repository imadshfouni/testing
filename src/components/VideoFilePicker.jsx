export function VideoFilePicker({ onSelect, disabled }) {
  return (
    <label className={`file-picker${disabled ? ' file-picker--disabled' : ''}`}>
      <input
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = '';
        }}
      />
      <span className="file-picker-label">Choose video file (MP4)</span>
    </label>
  );
}
