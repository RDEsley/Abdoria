package com.fateeight.evolyn;

import android.content.Intent;
import android.provider.Settings;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "EvolynNotifications")
public class EvolynNotificationsPlugin extends Plugin {
  @PluginMethod
  public void openChannelSettings(PluginCall call) {
    String channelId = call.getString("channelId");
    Intent intent = new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS);
    intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
    if (channelId != null && !channelId.isEmpty()) {
      intent.putExtra(Settings.EXTRA_CHANNEL_ID, channelId);
    }
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getContext().startActivity(intent);
    call.resolve();
  }
}
