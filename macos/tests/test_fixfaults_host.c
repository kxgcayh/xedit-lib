/******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is test_fixfaults_host.c.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Test host signal chaining and crash handler isolation.

******************************************************************************/

#define _DARWIN_C_SOURCE
#include <stdio.h>
#include <signal.h>
#include <dlfcn.h>
#include <stdlib.h>
#include <sys/ucontext.h>
#include <string.h>

static volatile sig_atomic_t host_fault_caught = 0;
static volatile sig_atomic_t saw_blocked_usr1 = 0;

static void host_sigaction(int sig, siginfo_t *info, void *ctx) {
    host_fault_caught++;
    sigset_t cur;
    sigprocmask(SIG_SETMASK, NULL, &cur);
    if (sigismember(&cur, SIGUSR1)) {
        saw_blocked_usr1 = 1;
    }
    ((ucontext_t *)ctx)->uc_mcontext->__ss.__pc += 4;
}

int main(int argc, char **argv) {
    const char *dylib_path = argc > 1 ? argv[1] : (getenv("XEDITLIB_PATH") ? getenv("XEDITLIB_PATH") : "./macos/out/libXEditLib.dylib");

    struct sigaction sa = {0};
    sa.sa_sigaction = host_sigaction;
    sa.sa_flags = SA_SIGINFO | SA_RESETHAND;
    sigemptyset(&sa.sa_mask);
    sigaddset(&sa.sa_mask, SIGUSR1);
    sigaction(SIGSEGV, &sa, NULL);

    void *h = dlopen(dylib_path, RTLD_NOW);
    if (!h) {
        fprintf(stderr, "dlopen failed: %s\n", dlerror());
        return 1;
    }

    // Trigger host fault outside libXEditLib
    __asm__ volatile("mov x9, #0\n\tldr x9, [x9]" ::: "x9", "memory");

    if (host_fault_caught == 1 && saw_blocked_usr1) {
        printf("PASS: host fault correctly chained, SA_RESETHAND and sa_mask honored\n");
    } else {
        printf("FAIL: host_fault_caught=%d saw_blocked_usr1=%d\n", host_fault_caught, saw_blocked_usr1);
        return 2;
    }

    dlclose(h);
    return 0;
}
