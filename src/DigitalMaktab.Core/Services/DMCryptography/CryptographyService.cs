using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace digitalmaktabapi.Services.DMCryptography
{
    public class CryptographyService : IDisposable
    {
        private readonly Aes aes;
        private bool disposed = false; // To detect redundant calls

        public CryptographyService()
        {
            // Create a new AES instance and generate a key and IV
            this.aes = Aes.Create();
            this.aes.KeySize = 256; // Set key size (you can use 128 or 192 bits as well)
            this.aes.GenerateKey();  // Generate a random key
            this.aes.GenerateIV();   // Generate a random IV (Initialization Vector)
        }

        /// <summary>
        /// Encrypts the given string using the AES algorithm.
        /// </summary>
        /// <param name="data">The data to encrypt.</param>
        /// <returns>The encrypted data as a Base64-encoded string.</returns>
        public string Encrypt(string data)
        {
            using (var encryptor = this.aes.CreateEncryptor(this.aes.Key, this.aes.IV))
            using (var ms = new MemoryStream())
            {
                using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
                using (var sw = new StreamWriter(cs))
                {
                    sw.Write(data);
                }
                var encryptedBytes = ms.ToArray();
                var combinedData = Combine(this.aes.IV, encryptedBytes);
                return Convert.ToBase64String(combinedData);
            }
        }

        /// <summary>
        /// Decrypts the given Base64-encoded encrypted string back to the original string.
        /// </summary>
        /// <param name="encryptedData">The encrypted data as a Base64-encoded string.</param>
        /// <returns>The decrypted string.</returns>
        public string Decrypt(string encryptedData)
        {
            var combinedData = Convert.FromBase64String(encryptedData);
            var iv = new byte[this.aes.BlockSize / 8];
            var cipherText = new byte[combinedData.Length - iv.Length];

            Array.Copy(combinedData, iv, iv.Length);
            Array.Copy(combinedData, iv.Length, cipherText, 0, cipherText.Length);

            using (var decryptor = this.aes.CreateDecryptor(this.aes.Key, iv))
            using (var ms = new MemoryStream(cipherText))
            using (var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read))
            using (var sr = new StreamReader(cs))
            {
                return sr.ReadToEnd();
            }
        }

        /// <summary>
        /// Combines the IV and the encrypted data into a single byte array.
        /// </summary>
        private static byte[] Combine(byte[] first, byte[] second)
        {
            var combined = new byte[first.Length + second.Length];
            Buffer.BlockCopy(first, 0, combined, 0, first.Length);
            Buffer.BlockCopy(second, 0, combined, first.Length, second.Length);
            return combined;
        }

        /// <summary>
        /// Dispose method to clean up resources.
        /// </summary>
        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        /// <summary>
        /// Protected implementation of Dispose pattern.
        /// </summary>
        /// <param name="disposing">Whether or not we are disposing</param>
        protected virtual void Dispose(bool disposing)
        {
            if (!this.disposed)
            {
                if (disposing)
                {
                    // Dispose managed state (managed objects).
                    this.aes?.Dispose();
                }

                // Free unmanaged resources (unmanaged objects) and override a finalizer below.
                // Set large fields to null.

                this.disposed = true;
            }
        }
    }
}