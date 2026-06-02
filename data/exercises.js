/* Exercise data. Loaded via a plain <script> tag (no server needed).
   Edit freely — durations & totals are computed from these numbers.
   repTime/restAfterSet/prepareTime/restAfterExercise are in seconds.

   name              : shown on screen (UTF-8, may be Persian/any language)
   description       : shown in the info modal; use "\n" for line breaks
   descDir           : "rtl" or "ltr" — direction used ONLY for the description text
   prepareTime       : get-ready countdown shown before the exercise starts (0 = none)
   restAfterExercise : "full rest" countdown after the exercise finishes
                       (default 30; ignored after the very last exercise)
   This file is saved as UTF-8. */
window.WORKOUT_DATA = {
  routines: {
    core1: {
      title: "Core & Lower-Back Stability",
      subtitle: "Pelvis, glutes & spine control",
      exercises: [
        {
          name: "Posterior Pelvic Tilt", image: "images/pelvic-tilt.gif",
          repTime: 5, reps: 10, sets: 3, restAfterSet: 30, prepareTime: 10, restAfterExercise: 60,
          descDir: "rtl",
          description: "به پشت دراز بکشید، زانوها را خم کنید و کف پاها روی زمین باشد. عضلات شکم را منقبض کرده و لگن را به آرامی به سمت عقب بچرخانید تا گودی کمر کمتر شده و کمر به زمین نزدیک شود. چند ثانیه نگه دارید و سپس به حالت اولیه برگردید."
        },
        {
          name: "Dead Bug", image: "images/dead-bug.gif",
          repTime: 4, reps: 8, sets: 3, restAfterSet: 45, prepareTime: 10, restAfterExercise: 60,
          descDir: "rtl",
          description: "به پشت دراز بکشید، زانوها را 90 درجه خم کرده و دست‌ها را به سمت سقف نگه دارید. همزمان یک دست و پای مخالف را به آرامی دور کنید و سپس به حالت اولیه برگردانید. در تمام مدت کمر باید روی زمین باقی بماند."
        },
        {
          name: "Glute Bridge", image: "images/glutebridge.webp",
          repTime: 4, reps: 12, sets: 3, restAfterSet: 60, prepareTime: 10, restAfterExercise: 90,
          descDir: "rtl",
          description: "به پشت دراز بکشید، زانوها خم و کف پاها روی زمین باشد. عضلات باسن را منقبض کرده و لگن را بالا بیاورید تا بدن از شانه تا زانو در یک خط قرار گیرد. سپس به آرامی پایین بیایید."
        },
        {
          name: "Bird Dog", image: "images/bird-dog.gif",
          repTime: 5, reps: 6, sets: 3, restAfterSet: 45, prepareTime: 10, restAfterExercise: 60,
          descDir: "rtl",
          description: "در وضعیت چهار دست و پا قرار بگیرید. یک دست و پای مخالف را همزمان صاف کنید و بدون چرخش لگن چند ثانیه نگه دارید. سپس به حالت اولیه برگشته و سمت دیگر را انجام دهید."
        },
        {
          name: "Wall Sit", image: "images/wall-sit.gif",
          repTime: 1, reps: 30, sets: 3, restAfterSet: 60, prepareTime: 10, restAfterExercise: 90,
          descDir: "rtl",
          description: "پشت خود را به دیوار تکیه دهید و به آرامی پایین بروید تا زانوها حدود نیمه خم شوند. این وضعیت را ثابت نگه دارید و سپس به حالت ایستاده برگردید."
        },
        {
          name: "Clamshell", image: "images/side-plank-clamshell.gif",
          repTime: 3, reps: 12, sets: 3, restAfterSet: 45, prepareTime: 10, restAfterExercise: 60,
          descDir: "rtl",
          description: "به پهلو بخوابید، زانوها را خم کنید و پاها را روی هم قرار دهید. بدون چرخش لگن، زانوی بالایی را بالا ببرید و سپس به آرامی پایین بیاورید."
        },
        {
          name: "Hip Hinge", image: "images/hip-hinge.gif",
          repTime: 4, reps: 8, sets: 3, restAfterSet: 60, prepareTime: 10, restAfterExercise: 90,
          descDir: "rtl",
          description: "صاف بایستید و دست‌ها را روی لگن قرار دهید. بدون خم کردن کمر، لگن را به عقب ببرید و تنه را کمی به جلو متمایل کنید. سپس با فشار عضلات باسن به حالت ایستاده برگردید."
        },
        {
          name: "McGill Curl-Up", image: "images/mcgill-curl-up.gif",
          repTime: 5, reps: 8, sets: 3, restAfterSet: 45, prepareTime: 10, restAfterExercise: 60,
          descDir: "rtl",
          description: "به پشت دراز بکشید، یک زانو خم و پای دیگر صاف باشد. دست‌ها را زیر گودی طبیعی کمر قرار دهید و سر و شانه‌ها را کمی از زمین بلند کنید بدون اینکه کمر خم شود. چند ثانیه نگه داشته و پایین بیایید."
        },
        {
          name: "Cat-Camel", image: "images/cat-camel.gif",
          repTime: 4, reps: 8, sets: 2, restAfterSet: 20, prepareTime: 10, restAfterExercise: 60,
          descDir: "rtl",
          description: "در وضعیت چهار دست و پا قرار بگیرید. به آرامی کمر را به سمت بالا گرد کنید و سپس در جهت مخالف حرکت دهید. حرکت باید آرام و کنترل‌شده باشد و برای افزایش تحرک ستون فقرات انجام شود."
        }
      ]
    },

    // ── Program 2 ── cloned from core1; edit freely. ──
    core2: {
      title: "Core & Lower-Back Stability 2",
      subtitle: "Pelvis, glutes & spine control",
      exercises: [
        {
          name: "Posterior Pelvic Tilt", image: "images/pelvic-tilt.gif",
          repTime: 5, reps: 10, sets: 3, restAfterSet: 30, prepareTime: 10, restAfterExercise: 60,
          descDir: "rtl",
          description: "به پشت دراز بکشید، زانوها را خم کنید و کف پاها روی زمین باشد. عضلات شکم را منقبض کرده و لگن را به آرامی به سمت عقب بچرخانید تا گودی کمر کمتر شده و کمر به زمین نزدیک شود. چند ثانیه نگه دارید و سپس به حالت اولیه برگردید."
        },
        {
          name: "Dead Bug", image: "images/dead-bug.gif",
          repTime: 4, reps: 8, sets: 3, restAfterSet: 45, prepareTime: 10, restAfterExercise: 60,
          descDir: "rtl",
          description: "به پشت دراز بکشید، زانوها را 90 درجه خم کرده و دست‌ها را به سمت سقف نگه دارید. همزمان یک دست و پای مخالف را به آرامی دور کنید و سپس به حالت اولیه برگردانید. در تمام مدت کمر باید روی زمین باقی بماند."
        },
        {
          name: "Glute Bridge", image: "images/glutebridge.webp",
          repTime: 4, reps: 12, sets: 3, restAfterSet: 60, prepareTime: 10, restAfterExercise: 90,
          descDir: "rtl",
          description: "به پشت دراز بکشید، زانوها خم و کف پاها روی زمین باشد. عضلات باسن را منقبض کرده و لگن را بالا بیاورید تا بدن از شانه تا زانو در یک خط قرار گیرد. سپس به آرامی پایین بیایید."
        },
        {
          name: "Bird Dog", image: "images/bird-dog.gif",
          repTime: 5, reps: 6, sets: 3, restAfterSet: 45, prepareTime: 10, restAfterExercise: 60,
          descDir: "rtl",
          description: "در وضعیت چهار دست و پا قرار بگیرید. یک دست و پای مخالف را همزمان صاف کنید و بدون چرخش لگن چند ثانیه نگه دارید. سپس به حالت اولیه برگشته و سمت دیگر را انجام دهید."
        },
        {
          name: "Wall Sit", image: "images/wall-sit.gif",
          repTime: 1, reps: 30, sets: 3, restAfterSet: 60, prepareTime: 10, restAfterExercise: 90,
          descDir: "rtl",
          description: "پشت خود را به دیوار تکیه دهید و به آرامی پایین بروید تا زانوها حدود نیمه خم شوند. این وضعیت را ثابت نگه دارید و سپس به حالت ایستاده برگردید."
        },
        {
          name: "Clamshell", image: "images/side-plank-clamshell.gif",
          repTime: 3, reps: 12, sets: 3, restAfterSet: 45, prepareTime: 10, restAfterExercise: 60,
          descDir: "rtl",
          description: "به پهلو بخوابید، زانوها را خم کنید و پاها را روی هم قرار دهید. بدون چرخش لگن، زانوی بالایی را بالا ببرید و سپس به آرامی پایین بیاورید."
        },
        {
          name: "Hip Hinge", image: "images/hip-hinge.gif",
          repTime: 4, reps: 8, sets: 3, restAfterSet: 60, prepareTime: 10, restAfterExercise: 90,
          descDir: "rtl",
          description: "صاف بایستید و دست‌ها را روی لگن قرار دهید. بدون خم کردن کمر، لگن را به عقب ببرید و تنه را کمی به جلو متمایل کنید. سپس با فشار عضلات باسن به حالت ایستاده برگردید."
        },
        {
          name: "McGill Curl-Up", image: "images/mcgill-curl-up.gif",
          repTime: 5, reps: 8, sets: 3, restAfterSet: 45, prepareTime: 10, restAfterExercise: 60,
          descDir: "rtl",
          description: "به پشت دراز بکشید، یک زانو خم و پای دیگر صاف باشد. دست‌ها را زیر گودی طبیعی کمر قرار دهید و سر و شانه‌ها را کمی از زمین بلند کنید بدون اینکه کمر خم شود. چند ثانیه نگه داشته و پایین بیایید."
        },
        {
          name: "Cat-Camel", image: "images/cat-camel.gif",
          repTime: 4, reps: 8, sets: 2, restAfterSet: 20, prepareTime: 10, restAfterExercise: 60,
          descDir: "rtl",
          description: "در وضعیت چهار دست و پا قرار بگیرید. به آرامی کمر را به سمت بالا گرد کنید و سپس در جهت مخالف حرکت دهید. حرکت باید آرام و کنترل‌شده باشد و برای افزایش تحرک ستون فقرات انجام شود."
        }
      ]
    }
  }
};
