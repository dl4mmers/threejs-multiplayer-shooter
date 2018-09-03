rollout parent_dialog "CG Level" --define a rollout and create a dialog 
(
	label lbl_test "Level Exporter 1.0"
	checkbox c "Textured"
	button btn_nextMap "Export!" width:150
	
	on btn_nextMap pressed do
	(
		--	if (doesFileExist "level.henri") == false then --check for file
			fs = createFile "level.henri" --create if its not there
		--	else
		--	fs = openFile "level.henri" mode:"w" --else open it mode w for writing

			--SCALE POS ROT 
			--FLIPPIN ZY!

			for i in $* do (
				s= i.scale
				print (i.width*s.x) to:fs
				print (i.height*s.z) to:fs
				print (i.length*s.y) to:fs	
				
				print (i.pos.x) to:fs
				print (i.pos.z) to:fs
				print (i.pos.y) to:fs
				
				q=i.rotation
				print q.x to:fs
				print q.y to:fs
				print q.z to:fs
				print q.w to:fs
				
				--print ((i.rotation.x_rotation/180*PI)) to:fs
				--print ((i.rotation.z_rotation/180*PI)) to:fs
				--print ((i.rotation.y_rotation/180*PI) ) to:fs
				
				
				--Dont't use Print, use Format instead.
				--format "%\n" <string or value> to:<filestream>
				-----------------------
				
				
			)
			close fs --close the fs
			print "Export succesfully"
		)
		
	button btn_fix "FixScale" width:150
	on btn_fix pressed do
	(
		for i in $* do (
				s= i.scale
				i.width=i.width*s.x
				i.height=i.height*s.z
				i.length=i.length*s.y
				i.scale.x=1
				i.scale.y=1
				i.scale.z=1
		)
	)

)

createDialog parent_dialog pos:[100,100] style:#(#style_titlebar, #style_border, #style_sysmenu, #style_minimizebox)
setFocus parent_dialog --set focus on the Parent dialog - the Child will still be drawn in front of it!
