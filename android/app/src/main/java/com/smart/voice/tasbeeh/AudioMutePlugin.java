package com.smart.voice.tasbeeh;

import android.content.Context;
import android.media.AudioManager;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AudioMute")
public class AudioMutePlugin extends Plugin {
    private int originalMusicVolume = -1;
    private int originalSystemVolume = -1;
    private int originalNotificationVolume = -1;

    @PluginMethod
    public void mute(PluginCall call) {
        AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (audioManager != null) {
            try {
                if (originalMusicVolume == -1) {
                    originalMusicVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
                }
                audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, 0, 0);
            } catch (Exception e) {
                Log.e("AudioMute", "Error muting MUSIC stream", e);
            }

            try {
                if (originalSystemVolume == -1) {
                    originalSystemVolume = audioManager.getStreamVolume(AudioManager.STREAM_SYSTEM);
                }
                audioManager.setStreamVolume(AudioManager.STREAM_SYSTEM, 0, 0);
            } catch (Exception e) {
                Log.e("AudioMute", "Error muting SYSTEM stream", e);
            }

            try {
                if (originalNotificationVolume == -1) {
                    originalNotificationVolume = audioManager.getStreamVolume(AudioManager.STREAM_NOTIFICATION);
                }
                audioManager.setStreamVolume(AudioManager.STREAM_NOTIFICATION, 0, 0);
            } catch (Exception e) {
                Log.e("AudioMute", "Error muting NOTIFICATION stream", e);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void unmute(PluginCall call) {
        // Delay unmuting by 1 second to allow the beep to finish
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                if (originalMusicVolume != -1) {
                    try {
                        audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, originalMusicVolume, 0);
                    } catch (Exception e) {
                        Log.e("AudioMute", "Error unmuting MUSIC stream", e);
                    }
                    originalMusicVolume = -1;
                }
                if (originalSystemVolume != -1) {
                    try {
                        audioManager.setStreamVolume(AudioManager.STREAM_SYSTEM, originalSystemVolume, 0);
                    } catch (Exception e) {
                        Log.e("AudioMute", "Error unmuting SYSTEM stream", e);
                    }
                    originalSystemVolume = -1;
                }
                if (originalNotificationVolume != -1) {
                    try {
                        audioManager.setStreamVolume(AudioManager.STREAM_NOTIFICATION, originalNotificationVolume, 0);
                    } catch (Exception e) {
                        Log.e("AudioMute", "Error unmuting NOTIFICATION stream", e);
                    }
                    originalNotificationVolume = -1;
                }
            }
            call.resolve();
        }, 1000); // 1000ms delay
    }
}
