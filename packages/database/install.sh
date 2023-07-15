#!/bin/bash

rm -rf dist/lib64
mkdir -p dist/lib64

# RUN yum install -y python3 make gcc-c++ && \
#     yum clean all && \
#     rm -rf /var/cache/yum
# 2.36-7.fc37 

# The following is a script to install glibc 2.29 on Amazon Linux 2
# wget -4c https://ftp.gnu.org/gnu/glibc/glibc-2.29.tar.gz
# tar -zxvf glibc-2.29.tar.gz
# cd glibc-2.29
# mkdir build_dir
# cd build_dir
# sudo ../configure --prefix=/opt/glibc
# sudo make
# sudo make install

# Our goal is to run it in a docker container so the resulting files can be copied to the lambda layer
# docker run --rm -v "$PWD"/dist/lib:/lambda/opt lambci/yumda:2  yum install -y glibc

docker run --rm -v "$PWD"/dist/lib64:/lambda/opt lambci/yumda:2 yum install wget -y && wget -4c https://ftp.gnu.org/gnu/glibc/glibc-2.29.tar.gz && \
    tar -zxvf glibc-2.29.tar.gz && \
    cd glibc-2.29 && \
    mkdir build_dir && \
    cd build_dir && \
    ../configure --prefix=/opt/glibc && \
    make && \
    make install

# Some files in dist/lib are symbolic links that need to be resolved
# Function to convert symbolic links to normal files recursively
# convert_links_recursive() {
#     local directory="$1"
    
#     # Loop through all files in the directory
#     for file in "$directory"/*; do
#         # Check if the file is a symbolic link
#         if [[ -L "$file" ]]; then
#             # Resolve the symbolic link and get the target file path
#             target_file=$(readlink "$file")

#             # Remove the symbolic link
#             rm "$file"

#             # Copy the target file to the original file's location
#             cp "$target_file" "$file"

#             echo "Converted symbolic link: $file"
#         elif [[ -d "$file" ]]; then
#             # If the file is a directory, call the function recursively
#             convert_links_recursive "$file"
#         fi
#     done
# }

# # Directory path
# directory="dist/lib"

# # Call the function to convert symbolic links recursively
# convert_links_recursive "$directory"