# LateAgain ??! — Full Upgrade

This version adds:

- Login + Register with Firebase Authentication
- Dashboard calendar
- Tasks and events with time ranges
- Monthly productivity chart
- Monthly Eisenhower Matrix
- User profile with bio, goals, and profile picture
- Friend requests
- Friend productivity visibility
- Project creation
- Project invitations
- Project members
- Project task assignment
- Project group chat

## 1. Run locally

Use a local server. Do not open the HTML files by double click.

```bash
python -m http.server 5500
```

Then open:

```txt
http://127.0.0.1:5500
```

or

```txt
http://localhost:5500
```

## 2. Firebase Authentication

Go to:

```txt
Firebase Console → Authentication → Sign-in method
```

Enable:

```txt
Email/Password
```

Also make sure these domains are authorized:

```txt
localhost
127.0.0.1
```

## 3. Firestore Rules

Go to:

```txt
Firebase Console → Firestore Database → Rules
```

Copy the content of `firestore.rules`, paste it there, then click:

```txt
Publish
```

## 4. Cloudinary profile pictures

This project does NOT use your Cloudinary API Secret.

Create an unsigned upload preset:

```txt
Cloudinary → Settings → Upload → Upload presets → Add upload preset
```

Use:

```txt
Signing Mode: Unsigned
Folder: lateagain_profiles
```

Then open:

```txt
assets/js/services/cloudinary.service.js
```

Change:

```js
const CLOUDINARY_UPLOAD_PRESET = "lateagain_profiles";
```

to the exact name of your unsigned preset.

Your cloud name from the screenshot appears to be already set:

```js
const CLOUDINARY_CLOUD_NAME = "dbpzeqzvl";
```

## 5. Firestore collections used

```txt
users/{uid}
users/{uid}/items/{itemId}
users/{uid}/stats/{YYYY-MM}
users/{uid}/friends/{friendUid}
users/{uid}/projects/{projectId}

friendRequests/{requestId}

projects/{projectId}
projects/{projectId}/members/{uid}
projects/{projectId}/tasks/{taskId}
projects/{projectId}/messages/{messageId}

projectInvites/{inviteId}
```

## 6. Important notes

- If Add Task says Firebase refused the save, your Firestore rules are not published.
- If Register/Login fails with `operation-not-allowed`, Email/Password is not enabled.
- If profile picture upload fails, your Cloudinary unsigned upload preset name is wrong or not unsigned.
- Friends can see your profile, goals, and monthly productivity stats after accepting the request.
- Project invitations appear inside the Projects page for the invited email.
