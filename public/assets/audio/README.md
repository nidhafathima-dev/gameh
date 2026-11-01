# 🎧 Spirit Audio Drop Folder

You can **directly drop your audio files** (MP3, MP4, WAV, M4A) into this folder.

### 📁 How it Works Automatically:
1. **Name the file after the spirit**:
   - For **Chathan**: name it `chathan.mp3`, `chathan.mp4`, or `spirit_1.mp3`
   - For **Eleanor**: name it `eleanor.mp3`, `eleanor.mp4`, or `spirit_2.mp3`
   - For **Malachi**: name it `malachi.mp3`, `malachi.mp4`, or `spirit_3.mp3`
   
2. **Auto-Discovery**:
   The Ouija board automatically checks this folder for audio matching the revealed spirit name or ID when the visitor asks *"Who are you?"*.

3. **MP4 Audio Files**:
   - Modern browsers can play the audio track from MP4 files directly.
   - Or, to automatically convert any dropped `.mp4` into high-quality `.mp3`, simply run:
     ```bash
     npm run convert-audio
     ```
   This will extract and generate the corresponding `.mp3` file right in this folder.
