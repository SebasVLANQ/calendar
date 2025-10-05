@@ .. @@
 CREATE POLICY "Admins can insert events"
   ON events
   FOR INSERT
   TO authenticated
   WITH CHECK (
     EXISTS (
       SELECT 1 FROM user_profiles 
       WHERE id = auth.uid() AND is_admin = true
     )
   );
 
-CREATE POLICY "Admins can update events"
+CREATE POLICY "Admins can update all event fields"
   ON events
   FOR UPDATE
   TO authenticated
   USING (
     EXISTS (
       SELECT 1 FROM user_profiles 
       WHERE id = auth.uid() AND is_admin = true
     )
   );
 
+CREATE POLICY "Users can update seat availability and status"
+  ON events
+  FOR UPDATE
+  TO authenticated
+  USING (true)
+  WITH CHECK (
+    -- Allow admins to update everything
+    EXISTS (
+      SELECT 1 FROM user_profiles 
+      WHERE id = auth.uid() AND is_admin = true
+    )
+    OR
+    -- Allow regular users to only update seats_available and status
+    -- and only when seats are being decremented or status is changing to fully-booked
+    (
+      -- Ensure only seats_available and status can be changed by non-admins
+      OLD.title = NEW.title AND
+      OLD.description = NEW.description AND
+      OLD.start_time = NEW.start_time AND
+      OLD.end_time = NEW.end_time AND
+      OLD.duration = NEW.duration AND
+      OLD.difficulty = NEW.difficulty AND
+      OLD.total_seats = NEW.total_seats AND
+      -- Allow seats_available to be decremented or stay the same
+      NEW.seats_available <= OLD.seats_available AND
+      NEW.seats_available >= 0 AND
+      -- Allow status to change to fully-booked when seats reach 0, or stay the same
+      (
+        (NEW.seats_available = 0 AND NEW.status = 'fully-booked') OR
+        (NEW.seats_available > 0 AND NEW.status = OLD.status) OR
+        NEW.status = OLD.status
+      )
+    )
+  );
+
 CREATE POLICY "Admins can delete events"